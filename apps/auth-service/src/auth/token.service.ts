import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { PrismaService } from "@school-erp/database";
import { generateSecureToken, sha256 } from "@school-erp/utils";
import type { JwtPayload } from "@school-erp/types";

interface GenerateTokensInput {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  schoolId?: string;
  plan: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private get accessSecret() {
    const s = process.env.JWT_ACCESS_SECRET;
    if (!s) throw new Error("JWT_ACCESS_SECRET is not set");
    return s;
  }

  private get refreshSecret() {
    const s = process.env.JWT_REFRESH_SECRET;
    if (!s) throw new Error("JWT_REFRESH_SECRET is not set");
    return s;
  }

  async generateTokenPair(input: GenerateTokensInput): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: JwtPayload = {
      sub: input.userId,
      email: input.email,
      role: input.role,
      tenantId: input.tenantId,
      schoolId: input.schoolId,
      plan: input.plan,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    });

    // Generate a random opaque refresh token (stored hashed in DB)
    const rawRefreshToken = generateSecureToken(40);
    const tokenHash = sha256(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId: input.userId,
        tokenHash,
        expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async refreshAccessToken(rawRefreshToken: string, ipAddress?: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const tokenHash = sha256(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { twoFactor: true } } },
    });

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: stored.user.tenantId },
      select: { plan: true },
    });
    const school = await this.prisma.school.findFirst({
      where: { tenantId: stored.user.tenantId },
      select: { id: true },
    });

    return this.generateTokenPair({
      userId: stored.userId,
      email: stored.user.email,
      role: stored.user.role,
      tenantId: stored.user.tenantId,
      schoolId: school?.id,
      plan: tenant.plan,
      ipAddress,
    });
  }

  async revokeRefreshToken(rawRefreshToken: string) {
    const tokenHash = sha256(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token, { secret: this.accessSecret });
  }
}
