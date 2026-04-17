import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";
import * as ExcelJS from "exceljs";
import { computePF } from "./statutory.service";

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── EPF ECR (Electronic Challan-cum-Return) format ──────────────────────────

  async generateECR(runId: string): Promise<Buffer> {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: {
        payslips: {
          include: { staff: { include: { user: { include: { profile: true } } } } },
        },
      },
    });
    if (!run) throw new NotFoundError("Payroll run not found");

    // ECR v2 format: UAN,MemberName,GrossSalary,EPFWages,EPS_Wages,EPFContrib,EPSContrib,Diff
    const lines: string[] = ["#~#UAN#~#Member Name#~#Gross Wages#~#EPF Wages#~#EPS Wages#~#EPF Contribution#~#EPS Contribution#~#EPF-EPS Diff#~#NCP Days#~#Refund of Advances"];

    for (const p of run.payslips) {
      const breakdown: any = p.breakdown;
      const basic = breakdown?.earnings?.Basic ?? 0;
      const pf = computePF(basic);
      const epsContrib = +(Math.min(basic, 15000) * 0.0833).toFixed(2);  // 8.33% EPS
      const epfDiff = +(pf.employerContribution - epsContrib).toFixed(2);
      const profile: any = (p.staff as any).user?.profile;
      const name = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();
      const uan = (p.staff as any).pfAccountNo ?? "N/A";

      lines.push(`#~#${uan}#~#${name}#~#${+p.grossSalary}#~#${Math.min(basic, 15000)}#~#${Math.min(basic, 15000)}#~#${pf.employeeContribution}#~#${epsContrib}#~#${epfDiff}#~#${p.lopDays}#~#0`);
    }

    return Buffer.from(lines.join("\n"), "utf-8");
  }

  // ─── Form 16 (TDS certificate) ────────────────────────────────────────────────

  async generateForm16(staffId: string, financialYear: string): Promise<Buffer> {
    // Get all payslips for this staff in the FY
    const [startYear, endYear] = financialYear.split("-").map(Number);
    const payslips = await this.prisma.payslip.findMany({
      where: {
        staffId,
        payrollRun: {
          OR: [
            { year: startYear, month: { gte: 4 } },  // Apr–Mar FY
            { year: endYear, month: { lte: 3 } },
          ],
        },
      },
      include: { payrollRun: true },
      orderBy: [{ payrollRun: { year: "asc" } }, { payrollRun: { month: "asc" } }],
    });

    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: { user: { include: { profile: true } } },
    });
    if (!staff) throw new NotFoundError("Staff not found");

    const profile: any = staff.user?.profile;
    const name = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();

    let totalGross = 0;
    let totalTDS = 0;

    for (const p of payslips) {
      const bd: any = p.breakdown;
      totalGross += +p.grossSalary;
      totalTDS += bd?.deductions?.TDS ?? 0;
    }

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Form 16");
    ws.addRow(["FORM 16 — TDS CERTIFICATE"]);
    ws.addRow(["Financial Year", financialYear]);
    ws.addRow(["Employee Name", name]);
    ws.addRow(["PAN", (staff as any).panNo ?? "N/A"]);
    ws.addRow([]);
    ws.addRow(["Month", "Gross Salary", "TDS Deducted"]);
    for (const p of payslips) {
      const bd: any = p.breakdown;
      ws.addRow([`${(p.payrollRun as any).month}/${(p.payrollRun as any).year}`, +p.grossSalary, bd?.deductions?.TDS ?? 0]);
    }
    ws.addRow([]);
    ws.addRow(["TOTAL", totalGross, totalTDS]);

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // ─── Payslip PDF ──────────────────────────────────────────────────────────────

  async generatePayslipHtml(runId: string, staffId: string): Promise<string> {
    const payslip = await this.prisma.payslip.findUnique({
      where: { payrollRunId_staffId: { payrollRunId: runId, staffId } },
      include: {
        staff: { include: { user: { include: { profile: true } }, designation: true } },
        payrollRun: true,
      },
    });
    if (!payslip) throw new NotFoundError("Payslip not found");

    const profile: any = (payslip.staff as any).user?.profile;
    const name = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();
    const bd: any = payslip.breakdown;
    const run: any = payslip.payrollRun;

    const earningsRows = Object.entries(bd?.earnings ?? {}).map(([k, v]) =>
      `<tr><td>${k}</td><td>₹${(v as number).toLocaleString("en-IN")}</td></tr>`).join("");

    const deductionsRows = Object.entries(bd?.deductions ?? {}).map(([k, v]) =>
      `<tr><td>${k}</td><td>₹${(v as number).toLocaleString("en-IN")}</td></tr>`).join("");

    return `<!DOCTYPE html>
<html><head><style>
body{font-family:Arial,sans-serif;font-size:12px;margin:20px}
h1{font-size:16px;text-align:center}
table{width:100%;border-collapse:collapse;margin:10px 0}
th,td{border:1px solid #ccc;padding:6px 10px}
th{background:#f0f0f0}
.total{font-weight:bold}
</style></head>
<body>
<h1>SALARY SLIP — ${run.month}/${run.year}</h1>
<table><tr><th>Employee Name</th><td>${name}</td><th>Designation</th><td>${(payslip.staff as any).designation?.name ?? ""}</td></tr>
<tr><th>Working Days</th><td>${payslip.workingDays}</td><th>LOP Days</th><td>${payslip.lopDays}</td></tr></table>
<table><tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr>
${Object.entries(bd?.earnings ?? {}).map(([k, v], i) => {
  const dedEntries = Object.entries(bd?.deductions ?? {});
  const [dk, dv] = dedEntries[i] ?? ["", ""];
  return `<tr><td>${k}</td><td>₹${(v as number).toLocaleString("en-IN")}</td><td>${dk}</td><td>${dk ? `₹${(dv as number).toLocaleString("en-IN")}` : ""}</td></tr>`;
}).join("")}
<tr class="total"><td>Gross Salary</td><td>₹${(+payslip.grossSalary).toLocaleString("en-IN")}</td>
<td>Total Deductions</td><td>₹${(+payslip.deductions).toLocaleString("en-IN")}</td></tr></table>
<h2 style="text-align:right">Net Salary: ₹${(+payslip.netSalary).toLocaleString("en-IN")}</h2>
<p><em>Password protected: Your Date of Birth (DDMMYYYY)</em></p>
</body></html>`;
  }
}
