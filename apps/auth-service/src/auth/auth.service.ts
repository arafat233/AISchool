import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";

import { PrismaService } from "@school-erp/database";
import {
  AccountDisabledError,
  InvalidCredentialsError,
  InvalidOtpError,
  TwoFactorRequiredError,
} from "@school-erp/errors";
import { generateOtp, generateSecureToken } from "@school-erp/utils";

import { TokenService } from "./token.service";
import { TotpService } from "./totp.service";
import { LoginDto } from "../dto/login.dto";
import { RegisterDto } from "../dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly totpService: TotpService,
  ) {}

  async validateLocalUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { twoFactor: true },
    });

    if (!user) throw new InvalidCredentialsError();
    if (!user.isActive) throw new AccountDisabledError();

    const passwordValid = await bcrypt.compare(password, user.passwordHash ?? "");
    if (!passwordValid) throw new InvalidCredentialsError();

    return user;
  }

  async login(dto: LoginDto, ipAddress: string, userAgent: string) {
    const user = await this.validateLocalUser(dto.email, dto.password);

    // 2FA required for privileged roles
    const requires2FA = ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"].includes(user.role);
    if (requires2FA && user.twoFactor?.isEnabled) {
      if (!dto.totpCode) {
        throw new TwoFactorRequiredError();
      }
      const valid = this.totpService.verify(user.twoFactor.secret!, dto.totpCode);
      if (!valid) throw new InvalidOtpError();
    }

    const school = await this.prisma.school.findFirst({
      where: { tenantId: user.tenantId },
      select: { id: true },
    });

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: user.tenantId },
      select: { plan: true },
    });

    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      schoolId: school?.id,
      plan: tenant.plan,
      ipAddress,
      userAgent,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: "LOGIN",
        entity: "User",
        entityId: user.id,
        ipAddress,
        userAgent,
      },
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new UnauthorizedException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        tenantId: dto.tenantId,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        role: dto.role,
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
      },
    });

    return { id: user.id, email: user.email };
  }

  async refreshTokens(refreshToken: string, ipAddress: string) {
    return this.tokenService.refreshAccessToken(refreshToken, ipAddress);
  }

  async logout(userId: string, refreshToken: string) {
    await this.tokenService.revokeRefreshToken(refreshToken);
    await this.prisma.auditLog.create({
      data: {
        tenantId: (await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })).tenantId,
        userId,
        action: "LOGOUT",
        entity: "User",
        entityId: userId,
      },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return; // silently ignore — don't reveal user existence

    const token = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expiresAt,
      },
    });

    // TODO: emit event to notification service to send reset email
    return { token }; // returned for testing; in prod, sent via email only
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) throw new UnauthorizedException("Invalid or expired reset token");

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
  }

  async setupTotp(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const { secret, otpauthUrl } = this.totpService.generateSecret(user.email);

    await this.prisma.twoFactorAuth.upsert({
      where: { userId },
      update: { secret, isEnabled: false },
      create: { userId, secret, isEnabled: false },
    });

    return { secret, otpauthUrl };
  }

  async verifyAndEnableTotp(userId: string, code: string) {
    const twoFactor = await this.prisma.twoFactorAuth.findUniqueOrThrow({ where: { userId } });
    const valid = this.totpService.verify(twoFactor.secret!, code);
    if (!valid) throw new InvalidOtpError();

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { isEnabled: true },
    });
  }

  async handleOAuthLogin(
    profile: { email: string; provider: string; providerId: string },
    ipAddress: string,
    userAgent: string,
  ) {
    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) throw new UnauthorizedException("No account found for this OAuth identity");

    await this.prisma.user.update({
      where: { id: user.id },
      data: { oauthProvider: profile.provider, oauthProviderId: profile.providerId },
    });

    const school = await this.prisma.school.findFirst({
      where: { tenantId: user.tenantId },
      select: { id: true },
    });
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: user.tenantId },
      select: { plan: true },
    });

    return this.tokenService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      schoolId: school?.id,
      plan: tenant.plan,
      ipAddress,
      userAgent,
    });
  }
}
