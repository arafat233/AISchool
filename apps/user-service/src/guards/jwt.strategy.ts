import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { isJwtBlacklisted } from "@school-erp/utils";
import type { JwtPayload, RequestUser } from "@school-erp/types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error("JWT_ACCESS_SECRET must be set and at least 32 characters long");
    }
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false, secretOrKey: secret });
  }
  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (!payload.sub || !payload.email || !payload.role || !payload.tenantId) throw new UnauthorizedException("Invalid token payload");
    if (payload.jti && await isJwtBlacklisted(payload.jti)) throw new UnauthorizedException("Token has been revoked");
    return { id: payload.sub, email: payload.email, role: payload.role, tenantId: payload.tenantId, schoolId: payload.schoolId, plan: payload.plan };
  }
}
