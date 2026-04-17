import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { LibraryController } from "./library.controller";
import { LibraryService } from "./library.service";
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
  controllers: [LibraryController],
  providers: [LibraryService, JwtStrategy],
})
export class LibraryModule {}
