import {
  Body, Controller, Get, Param, Post, Put, Query, Req, Res, UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";
import type { RequestUser } from "@school-erp/types";
import { SalaryStructureService } from "./salary-structure.service";
import { PayrollService } from "./payroll.service";
import { StatutoryService } from "./statutory.service";
import { GratuityService } from "./gratuity.service";
import { AdvanceService } from "./advance.service";
import { ExportService } from "./export.service";

@UseGuards(AuthGuard("jwt"))
@Controller("payroll")
export class PayrollController {
  constructor(
    private readonly structure: SalaryStructureService,
    private readonly payroll: PayrollService,
    private readonly statutory: StatutoryService,
    private readonly gratuity: GratuityService,
    private readonly advance: AdvanceService,
    private readonly exports: ExportService,
  ) {}

  // ─── Salary structure ─────────────────────────────────────────────────────────

  @Post("structure/:designationId/components")
  createComponent(@Param("designationId") designationId: string, @Body() body: any) {
    return this.structure.createComponent(designationId, body);
  }

  @Get("structure/:designationId")
  getStructure(@Param("designationId") designationId: string) {
    return this.structure.getStructure(designationId);
  }

  @Put("structure/components/:id")
  updateComponent(@Param("id") id: string, @Body() body: any) {
    return this.structure.updateComponent(id, body);
  }

  // ─── Payroll runs ─────────────────────────────────────────────────────────────

  @Post("runs")
  createRun(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.payroll.createRun(req.user.schoolId!, body);
  }

  @Get("runs")
  getRuns(@Req() req: Request & { user: RequestUser }, @Query("year") year?: string) {
    return this.payroll.getRuns(req.user.schoolId!, year ? +year : undefined);
  }

  @Post("runs/:id/process")
  processRun(@Param("id") id: string, @Body() options: any) {
    return this.payroll.processRun(id, options);
  }

  @Post("runs/:id/approve")
  approveRun(@Req() req: Request & { user: RequestUser }, @Param("id") id: string) {
    return this.payroll.approveRun(id, req.user.id);
  }

  @Post("runs/:id/disburse")
  disburseRun(@Param("id") id: string) {
    return this.payroll.disburseRun(id);
  }

  @Get("runs/:runId/staff/:staffId/payslip")
  getPayslip(@Param("runId") runId: string, @Param("staffId") staffId: string) {
    return this.payroll.getPayslip(runId, staffId);
  }

  @Get("staff/:staffId/payslips")
  getStaffPayslips(@Param("staffId") staffId: string) {
    return this.payroll.getStaffPayslips(staffId);
  }

  // ─── Statutory calculators ────────────────────────────────────────────────────

  @Get("calculate/pf")
  calcPF(@Query("basic") basic: string) {
    return this.statutory.computePF(+basic);
  }

  @Get("calculate/esi")
  calcESI(@Query("gross") gross: string) {
    return this.statutory.computeESI(+gross);
  }

  @Get("calculate/pt")
  calcPT(@Query("gross") gross: string, @Query("state") state = "DEFAULT") {
    return { professionalTax: this.statutory.computeProfessionalTax(+gross, state) };
  }

  @Get("calculate/tds")
  calcTDS(@Query("annualGross") annualGross: string) {
    return { monthlyTDS: this.statutory.computeMonthlyTDS(+annualGross) };
  }

  @Get("calculate/lwf")
  calcLWF(@Query("state") state = "DEFAULT") {
    return this.statutory.computeLWF(state);
  }

  // ─── Gratuity ─────────────────────────────────────────────────────────────────

  @Get("gratuity/staff/:staffId")
  getGratuity(@Param("staffId") staffId: string) {
    return this.gratuity.calculateGratuity(staffId);
  }

  @Post("gratuity/accrue")
  accrueGratuity(@Body("staffId") staffId: string, @Body("month") month: number, @Body("year") year: number) {
    return this.gratuity.accrueMonthlyProvision(staffId, month, year);
  }

  @Get("gratuity/provision")
  getTotalProvision(@Req() req: Request & { user: RequestUser }, @Query("year") year: string, @Query("month") month: string) {
    return this.gratuity.getTotalProvision(req.user.schoolId!, +year, +month);
  }

  // ─── Salary advances ──────────────────────────────────────────────────────────

  @Post("advances")
  requestAdvance(@Body() body: any) {
    return this.advance.requestAdvance(body);
  }

  @Post("advances/:id/approve")
  approveAdvance(@Req() req: Request & { user: RequestUser }, @Param("id") id: string) {
    return this.advance.approveAdvance(id, req.user.id);
  }

  @Post("advances/:id/reject")
  rejectAdvance(@Req() req: Request & { user: RequestUser }, @Param("id") id: string, @Body("remarks") remarks?: string) {
    return this.advance.rejectAdvance(id, req.user.id, remarks);
  }

  @Get("advances")
  getAdvances(@Req() req: Request & { user: RequestUser }, @Query("status") status?: string, @Query("staffId") staffId?: string) {
    return this.advance.getAdvances({ schoolId: req.user.schoolId!, staffId, status });
  }

  @Get("advances/outstanding/:staffId")
  getOutstanding(@Param("staffId") staffId: string) {
    return this.advance.getOutstandingBalance(staffId);
  }

  // ─── EPF ECR export ───────────────────────────────────────────────────────────

  @Get("runs/:runId/epf-ecr")
  async downloadECR(@Param("runId") runId: string, @Res() res: Response) {
    const buffer = await this.exports.generateECR(runId);
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="epf_ecr_${runId}.txt"`);
    res.send(buffer);
  }

  // ─── Form 16 ─────────────────────────────────────────────────────────────────

  @Get("form16/:staffId")
  async downloadForm16(
    @Param("staffId") staffId: string,
    @Query("fy") fy: string,
    @Res() res: Response,
  ) {
    const buffer = await this.exports.generateForm16(staffId, fy);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="form16_${staffId}_${fy}.xlsx"`);
    res.send(buffer);
  }

  // ─── Payslip HTML ─────────────────────────────────────────────────────────────

  @Get("runs/:runId/staff/:staffId/payslip/html")
  async getPayslipHtml(@Param("runId") runId: string, @Param("staffId") staffId: string, @Res() res: Response) {
    const html = await this.exports.generatePayslipHtml(runId, staffId);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  }
}
