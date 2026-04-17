import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ExamController } from "./exam.controller";
import { ExamService } from "./exam.service";
import { GradingService } from "./grading.service";
import { ReportCardService } from "./report-card.service";
import { JwtStrategy } from "../guards/jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [ExamController],
  providers: [ExamService, GradingService, ReportCardService, JwtStrategy],
})
export class ExamModule {}
