import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { HrController } from "./hr.controller";
import { StaffService } from "./staff.service";
import { RecruitmentService } from "./recruitment.service";
import { LeaveService } from "./leave.service";
import { TrainingService } from "./training.service";
import { ExitService } from "./exit.service";
import { GrievanceService } from "./grievance.service";
import { AppraisalService } from "./appraisal.service";
import { SubstituteService } from "./substitute.service";
import { JwtStrategy } from "../guards/jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [HrController],
  providers: [
    StaffService, RecruitmentService, LeaveService, TrainingService,
    ExitService, GrievanceService, AppraisalService, SubstituteService,
    JwtStrategy,
  ],
})
export class HrModule {}
