import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AcademicController } from "./academic.controller";
import { AcademicService } from "./academic.service";
import { JwtStrategy } from "../guards/jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [AcademicController],
  providers: [AcademicService, JwtStrategy],
})
export class AcademicModule {}
