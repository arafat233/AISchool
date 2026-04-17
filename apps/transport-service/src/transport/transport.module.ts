import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { TransportController } from "./transport.controller";
import { TransportService } from "./transport.service";
import { LocationGateway } from "./location.gateway";
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
  controllers: [TransportController],
  providers: [TransportService, LocationGateway, JwtStrategy],
})
export class TransportModule {}
