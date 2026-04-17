import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { JwtPayload, RequestUser } from "@school-erp/types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor() {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false, secretOrKey: process.env.JWT_ACCESS_SECRET || "fallback" });
  }
  validate(payload: JwtPayload): RequestUser {
    if (!payload.sub) throw new UnauthorizedException();
    return { id: payload.sub, email: payload.email, role: payload.role, tenantId: payload.tenantId, schoolId: payload.schoolId, plan: payload.plan };
  }
}
