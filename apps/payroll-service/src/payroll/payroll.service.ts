import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";
import { SalaryStructureService } from "./salary-structure.service";
import {
  computePF, computeESI, computeProfessionalTax, computeMonthlyTDS, computeLOPDeduction,
} from "./statutory.service";

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly structure: SalaryStructureService,
  ) {}

  // ─── Create payroll run ───────────────────────────────────────────────────────

  async createRun(schoolId: string, data: { academicYearId: string; month: number; year: number }) {
    const existing = await this.prisma.payrollRun.findUnique({ where: { schoolId_month_year: { schoolId, month: data.month, year: data.year } } });
    if (existing) throw new ConflictError("Payroll run already exists for this month");

    return this.prisma.payrollRun.create({ data: { schoolId, academicYearId: data.academicYearId, month: data.month, year: data.year, status: "DRAFT" } });
  }

  // ─── Process run ─────────────────────────────────────────────────────────────

  async processRun(runId: string, options: { stateCode?: string; workingDays?: number } = {}) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId }, include: { payslips: true } });
    if (!run) throw new NotFoundError("Payroll run not found");
    if (run.status !== "DRAFT") throw new ConflictError("Only DRAFT runs can be processed");

    await this.prisma.payrollRun.update({ where: { id: runId }, data: { status: "PROCESSING" } });

    const staff = await this.prisma.staff.findMany({
      where: { schoolId: run.schoolId, status: "ACTIVE" },
      include: { designation: { include: { salaryComponents: true } } },
    });

    const workingDays = options.workingDays ?? 26;
    const stateCode = options.stateCode ?? "DEFAULT";

    const payslips: any[] = [];

    for (const s of staff) {
      try {
        const components = (s.designation as any)?.salaryComponents ?? [];
        const basicComp = components.find((c: any) => c.name === "Basic");
        const basicAmount = basicComp ? +basicComp.value : 0;

        // Salary components
        const salaryResult = this.structure.computeSalary(components, basicAmount);

        // LOP days from attendance
        const lopRecord = await this.prisma.staffAttendance.aggregate({
          where: { staffId: s.id, date: { gte: new Date(run.year, run.month - 1, 1), lt: new Date(run.year, run.month, 1) }, status: "ABSENT" },
          _count: true,
        });
        const lopDays = lopRecord._count;

        const lopDeduction = computeLOPDeduction(salaryResult.gross, workingDays, lopDays);
        const grossAfterLop = +(salaryResult.gross - lopDeduction).toFixed(2);

        // Statutory deductions
        const pf = computePF(+(salaryResult.earnings["Basic"] ?? basicAmount));
        const esi = computeESI(grossAfterLop);
        const pt = computeProfessionalTax(grossAfterLop, stateCode);
        const tds = computeMonthlyTDS(grossAfterLop * 12);

        // Salary advances EMI deduction
        const advances = await this.prisma.salaryAdvance.findMany({
          where: { staffId: s.id, status: "ACTIVE" },
        });
        const advanceDed = advances.reduce((sum: number, a: any) => sum + (a.emiAmount ?? 0), 0);

        const totalDeductions = +(
          salaryResult.totalDeductions +
          lopDeduction +
          pf.employeeContribution +
          (esi.applicable ? esi.employeeContribution : 0) +
          pt + tds + advanceDed
        ).toFixed(2);

        const netSalary = +(grossAfterLop - pf.employeeContribution - (esi.applicable ? esi.employeeContribution : 0) - pt - tds - advanceDed).toFixed(2);

        const breakdown = {
          earnings: salaryResult.earnings,
          deductions: {
            ...salaryResult.deductions,
            LOP: lopDeduction,
            PF_Employee: pf.employeeContribution,
            ESI_Employee: esi.applicable ? esi.employeeContribution : 0,
            Professional_Tax: pt,
            TDS: tds,
            Advance_EMI: advanceDed,
          },
          employerContributions: {
            PF_Employer: pf.employerContribution,
            ESI_Employer: esi.applicable ? esi.employerContribution : 0,
          },
        };

        const payslip = await this.prisma.payslip.upsert({
          where: { payrollRunId_staffId: { payrollRunId: runId, staffId: s.id } },
          update: { workingDays, presentDays: workingDays - lopDays, lopDays, grossSalary: grossAfterLop, deductions: totalDeductions, netSalary, breakdown },
          create: { payrollRunId: runId, staffId: s.id, workingDays, presentDays: workingDays - lopDays, lopDays, grossSalary: grossAfterLop, deductions: totalDeductions, netSalary, breakdown },
        });

        payslips.push(payslip);

        // Deduct advance EMIs
        for (const a of advances) {
          const remaining = (a.outstandingAmount ?? 0) - (a.emiAmount ?? 0);
          await this.prisma.salaryAdvance.update({
            where: { id: a.id },
            data: {
              outstandingAmount: remaining,
              status: remaining <= 0 ? "CLOSED" : "ACTIVE",
            },
          });
        }
      } catch {
        // Skip this staff member's error, continue processing
      }
    }

    const totals = payslips.reduce((acc, p) => ({
      totalGross: acc.totalGross + +p.grossSalary,
      totalDeductions: acc.totalDeductions + +p.deductions,
      totalNet: acc.totalNet + +p.netSalary,
    }), { totalGross: 0, totalDeductions: 0, totalNet: 0 });

    return this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: "PROCESSED", processedAt: new Date(), totalGross: totals.totalGross, totalDeductions: totals.totalDeductions, totalNet: totals.totalNet },
      include: { payslips: true },
    });
  }

  async approveRun(runId: string, approvedBy: string) {
    return this.prisma.payrollRun.update({ where: { id: runId }, data: { status: "APPROVED", approvedBy, approvedAt: new Date() } });
  }

  async disburseRun(runId: string) {
    return this.prisma.payrollRun.update({ where: { id: runId }, data: { status: "DISBURSED", disbursedAt: new Date() } });
  }

  async getRuns(schoolId: string, year?: number) {
    return this.prisma.payrollRun.findMany({
      where: { schoolId, ...(year ? { year } : {}) },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  }

  async getPayslip(runId: string, staffId: string) {
    return this.prisma.payslip.findUnique({
      where: { payrollRunId_staffId: { payrollRunId: runId, staffId } },
      include: { staff: { include: { user: { include: { profile: true } } } } },
    });
  }

  async getStaffPayslips(staffId: string) {
    return this.prisma.payslip.findMany({
      where: { staffId },
      include: { payrollRun: true },
      orderBy: [{ payrollRun: { year: "desc" } }, { payrollRun: { month: "desc" } }],
    });
  }
}
