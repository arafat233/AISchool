import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { LmsController } from "./lms.controller";
import { CourseService } from "./course.service";
import { ProgressService } from "./progress.service";
import { LiveClassService } from "./live-class.service";
import { SyllabusService } from "./syllabus.service";
import { JwtStrategy } from "../guards/jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [LmsController],
  providers: [CourseService, ProgressService, LiveClassService, SyllabusService, JwtStrategy],
})
export class LmsModule {}
