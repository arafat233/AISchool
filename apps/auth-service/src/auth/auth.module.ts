import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";
import { TotpService } from "./totp.service";
import { GoogleStrategy } from "../strategies/google.strategy";
import { JwtStrategy } from "../strategies/jwt.strategy";
import { LocalStrategy } from "../strategies/local.strategy";
import { MicrosoftStrategy } from "../strategies/microsoft.strategy";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({}), // secrets injected per-call via JwtService options
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    TotpService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    MicrosoftStrategy,
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
