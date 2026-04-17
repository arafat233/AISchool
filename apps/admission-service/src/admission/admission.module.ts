import { Module } from "@nestjs/common";
import { AdmissionController } from "./admission.controller";
import { AdmissionService } from "./admission.service";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { JwtStrategy } from "../guards/jwt.strategy";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: cfg.get("JWT_EXPIRES_IN", "15m") },
      }),
    }),
  ],
  controllers: [AdmissionController],
  providers: [AdmissionService, JwtStrategy],
})
export class AdmissionModule {}
