import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import Redis from "ioredis";

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
  private readonly redis: Redis;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
    });
  }

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
    const jti = randomUUID();
    const payload: JwtPayload = {
      sub: input.userId,
      email: input.email,
      role: input.role,
      tenantId: input.tenantId,
      schoolId: input.schoolId,
      plan: input.plan,
      jti,
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
        deviceInfo: input.userAgent,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async refreshAccessToken(rawRefreshToken: string, ipAddress?: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const tokenHash = sha256(rawRefreshToken);

    // Atomic rotate: revoke old token in one update (prevents concurrent reuse)
    const revoked = await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });

    if (revoked.count === 0) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

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
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token, { secret: this.accessSecret });
  }

  async blacklistAccessToken(token: string): Promise<void> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, { secret: this.accessSecret });
    } catch {
      return; // already expired or invalid — no need to blacklist
    }
    if (!payload.jti || !payload.exp) return;
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.set(`jwt:bl:${payload.jti}`, "1", "EX", ttl);
    }
  }

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const val = await this.redis.get(`jwt:bl:${jti}`);
    return val !== null;
  }
}
