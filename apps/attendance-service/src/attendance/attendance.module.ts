import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { JwtStrategy } from "../guards/jwt.strategy";
import { StudentEnrolledProcessor } from "../processors/student-enrolled.processor";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [AttendanceController],
  providers: [AttendanceService, JwtStrategy, StudentEnrolledProcessor],
})
export class AttendanceModule {}
