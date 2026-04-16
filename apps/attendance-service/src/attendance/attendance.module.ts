import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { JwtStrategy } from "../guards/jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [AttendanceController],
  providers: [AttendanceService, JwtStrategy],
})
export class AttendanceModule {}
