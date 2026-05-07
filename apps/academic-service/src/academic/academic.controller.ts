import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { AcademicService } from "./academic.service";
import {
  CreateAcademicYearDto, CreateGradeLevelDto, CreateSectionDto, CreateSubjectDto,
  AssignSubjectDto, CreateTimetableSlotDto,
} from "./dto/academic.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("academic")
export class AcademicController {
  constructor(private readonly svc: AcademicService) {}

  // Academic Years
  @Post("years") createYear(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateAcademicYearDto) { return this.svc.createAcademicYear(req.user.schoolId!, dto); }
  @Get("years") getYears(@Req() req: Request & { user: RequestUser }) { return this.svc.getAcademicYears(req.user.schoolId!); }

  // Grade Levels
  @Post("grades") createGrade(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateGradeLevelDto) { return this.svc.createGradeLevel(req.user.schoolId!, dto); }
  @Get("grades") getGrades(@Req() req: Request & { user: RequestUser }) { return this.svc.getGradeLevels(req.user.schoolId!); }

  // Sections
  @Post("sections") createSection(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateSectionDto) { return this.svc.createSection(req.user.schoolId!, dto); }
  @Get("sections") getSections(@Req() req: Request & { user: RequestUser }, @Query("gradeLevelId") gradeLevelId?: string) { return this.svc.getSections(req.user.schoolId!, gradeLevelId); }

  // Subjects
  @Post("subjects") createSubject(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateSubjectDto) { return this.svc.createSubject(req.user.schoolId!, dto); }
  @Get("subjects") getSubjects(@Req() req: Request & { user: RequestUser }) { return this.svc.getSubjects(req.user.schoolId!); }
  @Post("class-subjects") assignSubject(@Body() dto: AssignSubjectDto) { return this.svc.assignSubjectToClass(dto); }

  // Timetable
  @Post("timetable") createSlot(@Body() dto: CreateTimetableSlotDto) { return this.svc.createTimetableSlot(dto); }
  @Get("timetable") getTimetable(@Query("sectionId") sectionId: string, @Query("academicYearId") academicYearId: string) { return this.svc.getTimetable(sectionId, academicYearId); }
  @Delete("timetable/:id") deleteSlot(@Param("id") id: string) { return this.svc.deleteTimetableSlot(id); }

  @Get("health") health() { return { status: "ok", service: "academic-service" }; }
}
