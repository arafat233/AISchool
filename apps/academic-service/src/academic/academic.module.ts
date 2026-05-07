import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AcademicController } from "./academic.controller";
import { AcademicService } from "./academic.service";
import { JwtStrategy } from "../guards/jwt.strategy";
import { AcademicCacheService } from "../cache/academic-cache.service";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [AcademicController],
  providers: [AcademicCacheService, AcademicService, JwtStrategy],
})
export class AcademicModule {}
