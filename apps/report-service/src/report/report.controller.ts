import { Controller, Get, Post, Param, Query, Body, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Response } from "express";
import { ReportService } from "./report.service";

@Controller()
@UseGuards(AuthGuard("jwt"))
export class ReportController {
  constructor(private readonly svc: ReportService) {}

  // ─── Attendance ────────────────────────────────────────────────────────────
  @Get("attendance/summary/:schoolId")
  async attendanceSummary(
    @Param("schoolId") schoolId: string,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("format") fmt: "json" | "pdf" | "excel" = "json",
    @Res() res: Response,
  ) {
    const data = await this.svc.getAttendanceSummary(schoolId, new Date(from), new Date(to), fmt);
    return this.send(res, data, fmt, "attendance-summary");
  }

  @Get("attendance/defaulters/:schoolId")
  async defaulters(@Param("schoolId") schoolId: string, @Query("threshold") threshold: string) {
    return this.svc.getDefaulterList(schoolId, threshold ? Number(threshold) : 75);
  }

  // ─── Fee ──────────────────────────────────────────────────────────────────
  @Get("fee/collection/:schoolId")
  async feeCollection(
    @Param("schoolId") schoolId: string,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("format") fmt: "json" | "pdf" | "excel" = "json",
    @Res() res: Response,
  ) {
    const data = await this.svc.getFeeCollectionReport(schoolId, new Date(from), new Date(to), fmt);
    return this.send(res, data, fmt, "fee-collection");
  }

  @Get("fee/defaulters/:schoolId")
  async feeDefaulters(@Param("schoolId") schoolId: string) {
    return this.svc.getFeeDefaulterReport(schoolId);
  }

  @Get("fee/receipt/:paymentId")
  async feeReceipt(@Param("paymentId") paymentId: string, @Res() res: Response) {
    const pdf = await this.svc.getFeeReceipt(paymentId);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="receipt-${paymentId}.pdf"` });
    res.send(pdf);
  }

  // ─── Academic ─────────────────────────────────────────────────────────────
  @Get("academic/results/:classId/:examId")
  async classResults(
    @Param("classId") classId: string,
    @Param("examId") examId: string,
    @Query("format") fmt: "json" | "pdf" | "excel" = "json",
    @Res() res: Response,
  ) {
    const data = await this.svc.getClassResultReport(classId, examId, fmt);
    return this.send(res, data, fmt, "class-results");
  }

  @Get("academic/report-card/:studentId/:examId")
  async reportCard(@Param("studentId") studentId: string, @Param("examId") examId: string, @Res() res: Response) {
    const pdf = await this.svc.getReportCard(studentId, examId);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="report-card-${studentId}.pdf"` });
    res.send(pdf);
  }

  // ─── HR ───────────────────────────────────────────────────────────────────
  @Get("hr/staff-attendance/:schoolId")
  async staffAttendance(
    @Param("schoolId") schoolId: string,
    @Query("month") month: string,
    @Query("year") year: string,
    @Query("format") fmt: "json" | "excel" = "json",
    @Res() res: Response,
  ) {
    const data = await this.svc.getStaffAttendanceSummary(schoolId, Number(month), Number(year), fmt);
    return this.send(res, data, fmt, "staff-attendance");
  }

  @Get("hr/payslip/:staffId")
  async payslip(
    @Param("staffId") staffId: string,
    @Query("month") month: string,
    @Query("year") year: string,
    @Res() res: Response,
  ) {
    const pdf = await this.svc.getPayslip(staffId, Number(month), Number(year));
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="payslip-${staffId}-${month}-${year}.pdf"` });
    res.send(pdf);
  }

  // ─── Finance ──────────────────────────────────────────────────────────────
  @Get("finance/budget-vs-actual/:schoolId")
  async budgetVsActual(
    @Param("schoolId") schoolId: string,
    @Query("academicYear") academicYear: string,
    @Query("format") fmt: "json" | "excel" = "json",
    @Res() res: Response,
  ) {
    const data = await this.svc.getBudgetVsActual(schoolId, academicYear, fmt);
    return this.send(res, data, fmt, "budget-vs-actual");
  }

  @Get("finance/scholarship/:schoolId")
  async scholarshipReport(
    @Param("schoolId") schoolId: string,
    @Query("format") fmt: "json" | "excel" = "json",
    @Res() res: Response,
  ) {
    const data = await this.svc.getScholarshipReport(schoolId, fmt);
    return this.send(res, data, fmt, "scholarships");
  }

  // ─── Admissions ──────────────────────────────────────────────────────────
  @Get("admissions/funnel/:schoolId")
  async admissionFunnel(@Param("schoolId") schoolId: string, @Query("academicYear") academicYear: string) {
    return this.svc.getAdmissionFunnel(schoolId, academicYear);
  }

  // ─── Ops Dashboard ────────────────────────────────────────────────────────
  @Get("dashboard/:schoolId")
  async opsDashboard(@Param("schoolId") schoolId: string) {
    return this.svc.getOpsDashboard(schoolId);
  }

  // ─── Custom Builder ───────────────────────────────────────────────────────
  @Post("custom")
  async customReport(@Body() body: any, @Res() res: Response) {
    const data = await this.svc.buildCustomReport(body);
    return this.send(res, data, body.format ?? "json", "custom-report");
  }

  // ─── Health ───────────────────────────────────────────────────────────────
  @Get("health")
  health() { return { status: "ok", service: "report-service" }; }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  private send(res: Response, data: any, format: string, name: string) {
    if (format === "pdf") {
      res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}.pdf"` });
      return res.send(data);
    }
    if (format === "excel") {
      res.set({ "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${name}.xlsx"` });
      return res.send(data);
    }
    return res.json(data);
  }
}
