import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import Redis from "ioredis";

import type { JwtPayload, RequestUser } from "@school-erp/types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  private readonly redis: Redis;

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET!,
    });
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (!payload.sub || !payload.email || !payload.role || !payload.tenantId) {
      throw new UnauthorizedException("Invalid token payload");
    }

    if (payload.jti) {
      const blacklisted = await this.redis.get(`jwt:bl:${payload.jti}`);
      if (blacklisted) throw new UnauthorizedException("Token has been revoked");
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      schoolId: payload.schoolId,
      plan: payload.plan,
    };
  }
}
