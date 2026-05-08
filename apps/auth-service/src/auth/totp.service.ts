import { Injectable } from "@nestjs/common";
import * as speakeasy from "speakeasy";
import Redis from "ioredis";

@Injectable()
export class TotpService {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
    });
  }

  private get issuer() {
    return process.env.TOTP_ISSUER || "SchoolERP";
  }

  generateSecret(userEmail: string): { secret: string; otpauthUrl: string } {
    const secretObj = speakeasy.generateSecret({
      name: `${this.issuer}:${userEmail}`,
      issuer: this.issuer,
      length: 32,
    });

    return {
      secret: secretObj.base32,
      otpauthUrl: secretObj.otpauth_url ?? "",
    };
  }

  async verifyWithReplayProtection(userId: string, secret: string, token: string): Promise<boolean> {
    const valid = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });
    if (!valid) return false;

    // Replay guard: mark this code as used for the duration it could be valid (3 windows × 30s)
    const key = `totp:used:${userId}:${token}`;
    const alreadyUsed = await this.redis.set(key, "1", "EX", 90, "NX");
    return alreadyUsed === "OK"; // null means key already existed → replay attempt
  }

  verify(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });
  }

  generateCurrentToken(secret: string): string {
    return speakeasy.totp({ secret, encoding: "base32" });
  }
}
