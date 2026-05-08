import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { AttendanceService } from "./attendance.service";
import { BulkAttendanceDto } from "../dto/bulk-attendance.dto";
import { CreateSessionDto } from "../dto/create-session.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly svc: AttendanceService) {}

  @Post("sessions")
  createSession(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateSessionDto) {
    return this.svc.createSession(req.user.schoolId!, { ...dto, createdById: req.user.id });
  }

  @Post("sessions/:id/mark")
  bulkMark(@Param("id") sessionId: string, @Req() req: Request & { user: RequestUser }, @Body() dto: BulkAttendanceDto) {
    return this.svc.bulkMark(sessionId, dto, req.user.id, req.user.schoolId!);
  }

  @Get("sessions/:id/records")
  getRecords(@Param("id") sessionId: string, @Req() req: Request & { user: RequestUser }) {
    return this.svc.getSessionRecords(sessionId, req.user.schoolId!);
  }

  @Get("students/:id/summary")
  studentSummary(@Param("id") studentId: string, @Req() req: Request & { user: RequestUser }, @Query("from") from: string, @Query("to") to: string) {
    return this.svc.getStudentSummary(studentId, from, to, req.user.schoolId!);
  }

  @Get("class-summary")
  classSummary(@Query("sectionId") sectionId: string, @Query("date") date: string) {
    return this.svc.getClassSummary(sectionId, date);
  }

  @Get("below-threshold")
  belowThreshold(
    @Req() req: Request & { user: RequestUser },
    @Query("sectionId") sectionId: string,
    @Query("academicYearId") academicYearId: string,
    @Query("threshold") threshold?: string,
  ) {
    return this.svc.getBelowThreshold(req.user.schoolId!, sectionId, academicYearId, threshold ? +threshold : 75);
  }

  @Get("health") health() { return { status: "ok", service: "attendance-service" }; }
}
