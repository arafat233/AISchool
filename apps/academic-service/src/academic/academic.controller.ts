import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { AcademicService } from "./academic.service";

@UseGuards(AuthGuard("jwt"))
@Controller("academic")
export class AcademicController {
  constructor(private readonly svc: AcademicService) {}

  // Academic Years
  @Post("years") createYear(@Req() req: Request & { user: RequestUser }, @Body() body: any) { return this.svc.createAcademicYear(req.user.schoolId!, body); }
  @Get("years") getYears(@Req() req: Request & { user: RequestUser }) { return this.svc.getAcademicYears(req.user.schoolId!); }

  // Grade Levels
  @Post("grades") createGrade(@Req() req: Request & { user: RequestUser }, @Body() body: any) { return this.svc.createGradeLevel(req.user.schoolId!, body); }
  @Get("grades") getGrades(@Req() req: Request & { user: RequestUser }) { return this.svc.getGradeLevels(req.user.schoolId!); }

  // Sections
  @Post("sections") createSection(@Req() req: Request & { user: RequestUser }, @Body() body: any) { return this.svc.createSection(req.user.schoolId!, body); }
  @Get("sections") getSections(@Req() req: Request & { user: RequestUser }, @Query("gradeLevelId") gradeLevelId?: string) { return this.svc.getSections(req.user.schoolId!, gradeLevelId); }

  // Subjects
  @Post("subjects") createSubject(@Req() req: Request & { user: RequestUser }, @Body() body: any) { return this.svc.createSubject(req.user.schoolId!, body); }
  @Get("subjects") getSubjects(@Req() req: Request & { user: RequestUser }) { return this.svc.getSubjects(req.user.schoolId!); }
  @Post("class-subjects") assignSubject(@Body() body: any) { return this.svc.assignSubjectToClass(body); }

  // Timetable
  @Post("timetable") createSlot(@Body() body: any) { return this.svc.createTimetableSlot(body); }
  @Get("timetable") getTimetable(@Query("sectionId") sectionId: string, @Query("academicYearId") academicYearId: string) { return this.svc.getTimetable(sectionId, academicYearId); }
  @Delete("timetable/:id") deleteSlot(@Param("id") id: string) { return this.svc.deleteTimetableSlot(id); }

  @Get("health") health() { return { status: "ok", service: "academic-service" }; }
}
