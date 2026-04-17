import {
  Body, Controller, Delete, Get, Param, Post, Put, Query,
  Req, Res, UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";
import type { RequestUser } from "@school-erp/types";
import { ExamService, ExamStatus, ExamType } from "./exam.service";

@UseGuards(AuthGuard("jwt"))
@Controller("exam")
export class ExamController {
  constructor(private readonly svc: ExamService) {}

  // ─── Exam CRUD ───────────────────────────────────────────────────────────────

  @Post()
  create(@Req() req: Request & { user: RequestUser }, @Body() body: { title: string; type: ExamType; academicYearId: string; term: string; description?: string }) {
    return this.svc.createExam(req.user.schoolId!, body);
  }

  @Get()
  findAll(
    @Req() req: Request & { user: RequestUser },
    @Query("academicYearId") academicYearId?: string,
    @Query("status") status?: ExamStatus,
    @Query("type") type?: ExamType,
  ) {
    return this.svc.getExams(req.user.schoolId!, { academicYearId, status, type });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.svc.getExam(id);
  }

  @Put(":id/status")
  updateStatus(@Param("id") id: string, @Body("status") status: ExamStatus) {
    return this.svc.updateExamStatus(id, status);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.svc.deleteExam(id);
  }

  // ─── Schedule ────────────────────────────────────────────────────────────────

  @Post(":id/schedule")
  createSchedule(@Param("id") examId: string, @Body() body: any) {
    return this.svc.createScheduleEntry({ ...body, examId });
  }

  @Get(":id/schedule")
  getSchedule(@Param("id") examId: string) {
    return this.svc.getSchedule(examId);
  }

  @Delete("schedule/:entryId")
  deleteSchedule(@Param("entryId") entryId: string) {
    return this.svc.deleteScheduleEntry(entryId);
  }

  // ─── Hall Tickets ────────────────────────────────────────────────────────────

  @Get(":id/hall-ticket/:studentId")
  async hallTicket(@Param("id") examId: string, @Param("studentId") studentId: string, @Res() res: Response) {
    const pdf = await this.svc.generateHallTicket(examId, studentId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="hall-ticket-${studentId}.pdf"`);
    res.send(pdf);
  }

  @Get(":id/hall-tickets-bulk")
  async bulkHallTickets(@Param("id") examId: string, @Query("sectionId") sectionId: string, @Res() res: Response) {
    const zip = await this.svc.bulkHallTickets(examId, sectionId);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="hall-tickets-${sectionId}.zip"`);
    res.send(zip);
  }

  // ─── Marks Entry ─────────────────────────────────────────────────────────────

  @Post("schedule/:entryId/marks")
  submitMarks(@Param("entryId") entryId: string, @Body() body: { marks: { studentId: string; theory: number; practical?: number; internal?: number; isAbsent?: boolean }[] }) {
    return this.svc.submitMarks(entryId, body.marks);
  }

  @Get("schedule/:entryId/marks")
  getMarks(@Param("entryId") entryId: string) {
    return this.svc.getMarks(entryId);
  }

  // ─── Validation ──────────────────────────────────────────────────────────────

  @Get(":id/validate-marks")
  validateMarks(@Param("id") examId: string) {
    return this.svc.validateMarksCompleteness(examId);
  }

  // ─── Grace Marks ─────────────────────────────────────────────────────────────

  @Post(":id/grace-marks")
  applyGrace(@Param("id") examId: string, @Body() body: any) {
    return this.svc.applyGraceMarks(examId, body);
  }

  @Post(":id/grace-policy")
  upsertGracePolicy(@Param("id") examId: string, @Body() body: any) {
    return this.svc.upsertGraceMarksPolicy(examId, body);
  }

  // ─── Grading Config ──────────────────────────────────────────────────────────

  @Post("grading-config")
  upsertGradingConfig(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.upsertGradingConfig(req.user.schoolId!, body);
  }

  @Get("grading-config")
  getGradingConfig(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getGradingConfig(req.user.schoolId!);
  }

  // ─── Results ─────────────────────────────────────────────────────────────────

  @Post(":id/calculate-results")
  calculateResults(@Param("id") examId: string) {
    return this.svc.calculateResults(examId);
  }

  @Post(":id/publish")
  publishResults(@Param("id") examId: string) {
    return this.svc.publishResults(examId);
  }

  @Get(":id/results/:studentId")
  getStudentResult(@Param("id") examId: string, @Param("studentId") studentId: string) {
    return this.svc.getResult(examId, studentId);
  }

  @Get(":id/results")
  getSectionResults(@Param("id") examId: string, @Query("sectionId") sectionId: string) {
    return this.svc.getSectionResults(examId, sectionId);
  }

  // ─── Report Cards ─────────────────────────────────────────────────────────────

  @Get(":id/report-card/:studentId")
  async reportCard(@Param("id") examId: string, @Param("studentId") studentId: string, @Res() res: Response) {
    const pdf = await this.svc.generateReportCard(examId, studentId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="report-card-${studentId}.pdf"`);
    res.send(pdf);
  }

  @Get(":id/report-cards-bulk")
  async bulkReportCards(@Param("id") examId: string, @Query("sectionId") sectionId: string, @Res() res: Response) {
    const zip = await this.svc.bulkReportCards(examId, sectionId);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="report-cards-${sectionId}.zip"`);
    res.send(zip);
  }

  // ─── Board Registration ───────────────────────────────────────────────────────

  @Get(":id/board-registration")
  async boardRegistration(
    @Param("id") examId: string,
    @Query("format") format: "excel" | "xml" = "excel",
    @Res() res: Response,
  ) {
    const data = await this.svc.exportBoardRegistration(examId, format);
    if (format === "excel") {
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="board-registration-${examId}.xlsx"`);
    } else {
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Content-Disposition", `attachment; filename="board-registration-${examId}.xml"`);
    }
    res.send(data);
  }

  @Get("health")
  health() { return { status: "ok", service: "exam-service" }; }
}
