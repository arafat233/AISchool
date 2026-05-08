import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Req } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { LibraryService } from "./library.service";
import { CreateBookDto, UpdateBookDto, CreateEBookDto, CreatePeriodicalDto, RecordPeriodicalIssueDto, SuggestBookDto } from "../dto/library.dto";
import { CreateReadingProgramDto, LogReadingEntryDto } from "./dto/reading-program.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("library")
export class LibraryController {
  constructor(private readonly svc: LibraryService) {}

  // ─── Book catalogue ───────────────────────────────────────────────────────

  @Post("books")
  createBook(@Req() req: Request & { user: RequestUser }, @Body() body: CreateBookDto) {
    return this.svc.createBook(req.user.schoolId!, body);
  }

  @Patch("books/:bookId")
  updateBook(@Param("bookId") bookId: string, @Body() body: UpdateBookDto) {
    return this.svc.updateBook(bookId, body);
  }

  @Get("books")
  searchBooks(
    @Req() req: Request & { user: RequestUser },
    @Query("q") q?: string,
    @Query("category") category?: string,
    @Query("author") author?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.svc.searchBooks(req.user.schoolId!, q, category, author, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  // ─── Issue / return ───────────────────────────────────────────────────────

  @Post("issue")
  issueBook(@Req() req: Request & { user: RequestUser }, @Body() body: { bookIdOrBarcode: string; memberId: string; memberRole: string; daysOnLoan?: number }) {
    return this.svc.issueBook(req.user.schoolId!, body.bookIdOrBarcode, body.memberId, body.memberRole, body.daysOnLoan);
  }

  @Post("issues/:issueId/return")
  returnBook(@Param("issueId") issueId: string) {
    return this.svc.returnBook(issueId);
  }

  @Post("issues/:issueId/renew")
  renewIssue(@Param("issueId") issueId: string, @Body() body?: { extraDays?: number }) {
    return this.svc.renewIssue(issueId, body?.extraDays);
  }

  // ─── Member ───────────────────────────────────────────────────────────────

  @Get("members/:memberId/issues")
  getMemberIssues(@Param("memberId") memberId: string, @Query("role") role: string, @Query("active") active?: string) {
    return this.svc.getMemberIssues(memberId, role, active !== "false");
  }

  @Get("members/:memberId/stats")
  getMemberStats(@Req() req: Request & { user: RequestUser }, @Param("memberId") memberId: string, @Query("role") role: string) {
    return this.svc.getMemberStats(req.user.schoolId!, memberId, role);
  }

  // ─── Reservations ─────────────────────────────────────────────────────────

  @Post("reservations")
  reserveBook(@Req() req: Request & { user: RequestUser }, @Body() body: { bookId: string; memberId: string; memberRole: string }) {
    return this.svc.reserveBook(req.user.schoolId!, body.bookId, body.memberId, body.memberRole);
  }

  @Patch("reservations/:id/cancel")
  cancelReservation(@Param("id") id: string) {
    return this.svc.cancelReservation(id);
  }

  // ─── Fine config ──────────────────────────────────────────────────────────

  @Post("fine-config")
  setFineConfig(@Req() req: Request & { user: RequestUser }, @Body() body: { dailyRateRs: number; graceDays?: number; maxFineRs?: number }) {
    return this.svc.setFineConfig(req.user.schoolId!, body.dailyRateRs, body.graceDays, body.maxFineRs);
  }

  @Get("overdue")
  getOverdueList(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getOverdueList(req.user.schoolId!);
  }

  @Patch("issues/:issueId/fine-paid")
  markFinePaid(@Param("issueId") issueId: string) {
    return this.svc.markFinePaid(issueId);
  }

  // ─── eBooks ───────────────────────────────────────────────────────────────

  @Post("ebooks")
  createEBook(@Req() req: Request & { user: RequestUser }, @Body() body: CreateEBookDto) {
    return this.svc.createEBook(req.user.schoolId!, body);
  }

  @Get("ebooks")
  getEBooks(@Req() req: Request & { user: RequestUser }, @Query("subject") subject?: string, @Query("gradeLevel") gradeLevel?: string) {
    return this.svc.getEBooks(req.user.schoolId!, subject, gradeLevel);
  }

  @Post("ebooks/:ebookId/read-log")
  logEBookRead(@Param("ebookId") ebookId: string, @Body() body: { studentId: string; minutesRead: number }) {
    return this.svc.logEBookRead(ebookId, body.studentId, body.minutesRead);
  }

  @Get("ebooks/stats/:studentId")
  getEBookStats(@Req() req: Request & { user: RequestUser }, @Param("studentId") studentId: string) {
    return this.svc.getEBookReadStats(studentId, req.user.schoolId!);
  }

  // ─── Periodicals ──────────────────────────────────────────────────────────

  @Post("periodicals")
  createPeriodical(@Req() req: Request & { user: RequestUser }, @Body() body: CreatePeriodicalDto) {
    return this.svc.createPeriodical(req.user.schoolId!, body);
  }

  @Post("periodicals/:periodicalId/issues")
  recordPeriodicalIssue(@Param("periodicalId") periodicalId: string, @Body() body: RecordPeriodicalIssueDto) {
    return this.svc.recordPeriodicalIssue(periodicalId, { ...body, issueDate: new Date(body.issueDate) });
  }

  @Get("periodicals")
  getPeriodicals(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getPeriodicals(req.user.schoolId!);
  }

  // ─── Stock audit ──────────────────────────────────────────────────────────

  @Post("audits")
  startAudit(@Req() req: Request & { user: RequestUser }, @Body() body: { conductedBy: string }) {
    return this.svc.startStockAudit(req.user.schoolId!, body.conductedBy);
  }

  @Post("audits/:auditId/entries")
  addAuditEntry(@Param("auditId") auditId: string, @Body() body: { bookId: string; physicalCount: number }) {
    return this.svc.recordAuditEntry(auditId, body.bookId, body.physicalCount);
  }

  @Post("audits/:auditId/complete")
  completeAudit(@Param("auditId") auditId: string, @Body() body?: { notes?: string }) {
    return this.svc.completeStockAudit(auditId, body?.notes);
  }

  @Get("audits/:auditId")
  getAuditReport(@Param("auditId") auditId: string) {
    return this.svc.getAuditReport(auditId);
  }

  // ─── Recommendations ──────────────────────────────────────────────────────

  @Post("recommendations")
  suggestBook(@Req() req: Request & { user: RequestUser }, @Body() body: SuggestBookDto) {
    return this.svc.suggestBook(req.user.schoolId!, body);
  }

  @Patch("recommendations/:id/review")
  reviewRecommendation(@Param("id") id: string, @Body() body: { action: "APPROVED" | "REJECTED"; approvedBy: string; purchaseOrderRef?: string }) {
    return this.svc.reviewRecommendation(id, body.action, body.approvedBy, body.purchaseOrderRef);
  }

  @Get("recommendations")
  getRecommendations(@Req() req: Request & { user: RequestUser }, @Query("status") status?: string) {
    return this.svc.getRecommendations(req.user.schoolId!, status);
  }

  // ─── Inter-library loan ───────────────────────────────────────────────────

  @Post("inter-library-loans")
  issueILL(@Req() req: Request & { user: RequestUser }, @Body() body: { bookId: string; memberId: string; memberRole: string; partnerSchoolId: string; daysOnLoan?: number }) {
    return this.svc.issueInterLibraryLoan(req.user.schoolId!, body.bookId, body.memberId, body.memberRole, body.partnerSchoolId, body.daysOnLoan);
  }

  @Get("inter-library-loans")
  getILLs(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getInterLibraryLoans(req.user.schoolId!);
  }

  // ─── Reading program ──────────────────────────────────────────────────────

  @Post("reading-programs")
  createProgram(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateReadingProgramDto) {
    return this.svc.createReadingProgram(req.user.schoolId!, { ...dto, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) });
  }

  @Post("reading-programs/:programId/logs")
  logReading(@Param("programId") programId: string, @Body() dto: LogReadingEntryDto) {
    return this.svc.logReadingEntry(programId, dto.studentId, dto);
  }

  @Patch("reading-logs/:logId/validate")
  validateReading(@Param("logId") logId: string, @Body() body: { validatedBy: string }) {
    return this.svc.validateReadingEntry(logId, body.validatedBy);
  }

  @Get("reading-programs/:programId/leaderboard")
  getLeaderboard(@Param("programId") programId: string) {
    return this.svc.getReadingLeaderboard(programId);
  }

  @Get("reading-programs/:programId/students/:studentId")
  getStudentProgress(@Param("programId") programId: string, @Param("studentId") studentId: string) {
    return this.svc.getStudentReadingProgress(programId, studentId);
  }

  // ─── Health ───────────────────────────────────────────────────────────────

  @Get("health")
  health() { return { status: "ok", service: "library-service" }; }
}
