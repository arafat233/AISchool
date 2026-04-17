import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { LibraryService } from "./library.service";

@UseGuards(AuthGuard("jwt"))
@Controller("library")
export class LibraryController {
  constructor(private readonly svc: LibraryService) {}

  // ─── Book catalogue ───────────────────────────────────────────────────────

  @Post(":schoolId/books")
  createBook(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.createBook(schoolId, body);
  }

  @Patch("books/:bookId")
  updateBook(@Param("bookId") bookId: string, @Body() body: any) {
    return this.svc.updateBook(bookId, body);
  }

  @Get(":schoolId/books")
  searchBooks(@Param("schoolId") schoolId: string, @Query("q") q?: string, @Query("category") category?: string, @Query("author") author?: string) {
    return this.svc.searchBooks(schoolId, q, category, author);
  }

  // ─── Issue / return ───────────────────────────────────────────────────────

  @Post(":schoolId/issue")
  issueBook(@Param("schoolId") schoolId: string, @Body() body: { bookIdOrBarcode: string; memberId: string; memberRole: string; daysOnLoan?: number }) {
    return this.svc.issueBook(schoolId, body.bookIdOrBarcode, body.memberId, body.memberRole, body.daysOnLoan);
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

  @Get(":schoolId/members/:memberId/stats")
  getMemberStats(@Param("schoolId") schoolId: string, @Param("memberId") memberId: string, @Query("role") role: string) {
    return this.svc.getMemberStats(schoolId, memberId, role);
  }

  // ─── Reservations ─────────────────────────────────────────────────────────

  @Post(":schoolId/reservations")
  reserveBook(@Param("schoolId") schoolId: string, @Body() body: { bookId: string; memberId: string; memberRole: string }) {
    return this.svc.reserveBook(schoolId, body.bookId, body.memberId, body.memberRole);
  }

  @Patch("reservations/:id/cancel")
  cancelReservation(@Param("id") id: string) {
    return this.svc.cancelReservation(id);
  }

  // ─── Fine config ──────────────────────────────────────────────────────────

  @Post(":schoolId/fine-config")
  setFineConfig(@Param("schoolId") schoolId: string, @Body() body: { dailyRateRs: number; graceDays?: number; maxFineRs?: number }) {
    return this.svc.setFineConfig(schoolId, body.dailyRateRs, body.graceDays, body.maxFineRs);
  }

  @Get(":schoolId/overdue")
  getOverdueList(@Param("schoolId") schoolId: string) {
    return this.svc.getOverdueList(schoolId);
  }

  @Patch("issues/:issueId/fine-paid")
  markFinePaid(@Param("issueId") issueId: string) {
    return this.svc.markFinePaid(issueId);
  }

  // ─── eBooks ───────────────────────────────────────────────────────────────

  @Post(":schoolId/ebooks")
  createEBook(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.createEBook(schoolId, body);
  }

  @Get(":schoolId/ebooks")
  getEBooks(@Param("schoolId") schoolId: string, @Query("subject") subject?: string, @Query("gradeLevel") gradeLevel?: string) {
    return this.svc.getEBooks(schoolId, subject, gradeLevel);
  }

  @Post("ebooks/:ebookId/read-log")
  logEBookRead(@Param("ebookId") ebookId: string, @Body() body: { studentId: string; minutesRead: number }) {
    return this.svc.logEBookRead(ebookId, body.studentId, body.minutesRead);
  }

  @Get(":schoolId/ebooks/stats/:studentId")
  getEBookStats(@Param("schoolId") schoolId: string, @Param("studentId") studentId: string) {
    return this.svc.getEBookReadStats(studentId, schoolId);
  }

  // ─── Periodicals ──────────────────────────────────────────────────────────

  @Post(":schoolId/periodicals")
  createPeriodical(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.createPeriodical(schoolId, body);
  }

  @Post("periodicals/:periodicalId/issues")
  recordPeriodicalIssue(@Param("periodicalId") periodicalId: string, @Body() body: any) {
    return this.svc.recordPeriodicalIssue(periodicalId, { ...body, issueDate: new Date(body.issueDate) });
  }

  @Get(":schoolId/periodicals")
  getPeriodicals(@Param("schoolId") schoolId: string) {
    return this.svc.getPeriodicals(schoolId);
  }

  // ─── Stock audit ──────────────────────────────────────────────────────────

  @Post(":schoolId/audits")
  startAudit(@Param("schoolId") schoolId: string, @Body() body: { conductedBy: string }) {
    return this.svc.startStockAudit(schoolId, body.conductedBy);
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

  @Post(":schoolId/recommendations")
  suggestBook(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.suggestBook(schoolId, body);
  }

  @Patch("recommendations/:id/review")
  reviewRecommendation(@Param("id") id: string, @Body() body: { action: "APPROVED" | "REJECTED"; approvedBy: string; purchaseOrderRef?: string }) {
    return this.svc.reviewRecommendation(id, body.action, body.approvedBy, body.purchaseOrderRef);
  }

  @Get(":schoolId/recommendations")
  getRecommendations(@Param("schoolId") schoolId: string, @Query("status") status?: string) {
    return this.svc.getRecommendations(schoolId, status);
  }

  // ─── Inter-library loan ───────────────────────────────────────────────────

  @Post(":schoolId/inter-library-loans")
  issueILL(@Param("schoolId") schoolId: string, @Body() body: { bookId: string; memberId: string; memberRole: string; partnerSchoolId: string; daysOnLoan?: number }) {
    return this.svc.issueInterLibraryLoan(schoolId, body.bookId, body.memberId, body.memberRole, body.partnerSchoolId, body.daysOnLoan);
  }

  @Get(":schoolId/inter-library-loans")
  getILLs(@Param("schoolId") schoolId: string) {
    return this.svc.getInterLibraryLoans(schoolId);
  }

  // ─── Reading program ──────────────────────────────────────────────────────

  @Post(":schoolId/reading-programs")
  createProgram(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.createReadingProgram(schoolId, { ...body, startDate: new Date(body.startDate), endDate: new Date(body.endDate) });
  }

  @Post("reading-programs/:programId/logs")
  logReading(@Param("programId") programId: string, @Body() body: any) {
    return this.svc.logReadingEntry(programId, body.studentId, body);
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
}
