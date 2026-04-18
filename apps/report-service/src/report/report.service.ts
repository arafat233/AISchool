import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";

// ─── PDF Engine ───────────────────────────────────────────────────────────────
// Puppeteer is used in headless mode to convert HTML templates to PDF.
// We use a thin wrapper so the actual chromium path can be injected via env.
async function renderPdf(html: string): Promise<Buffer> {
  // Dynamic import so build succeeds even if puppeteer-core is not installed in dev
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const puppeteer = require("puppeteer-core");
  const executablePath = process.env.CHROMIUM_PATH ?? "/usr/bin/chromium-browser";
  const browser = await puppeteer.launch({ executablePath, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();
  return Buffer.from(pdf);
}

// ─── Excel Engine ─────────────────────────────────────────────────────────────
async function buildExcel(sheetName: string, columns: string[], rows: any[][]): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ExcelJS = require("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRow(columns);
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────
const wrap = (title: string, body: string) => `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px}h1{font-size:18px}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px}
th{background:#f0f0f0}</style></head><body><h1>${title}</h1>${body}</body></html>`;

const table = (heads: string[], rows: any[][]) =>
  `<table><tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr>
${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("")}</table>`;

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // [1] ATTENDANCE REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  async getAttendanceSummary(schoolId: string, fromDate: Date, toDate: Date, format: "json" | "pdf" | "excel" = "json") {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { schoolId, date: { gte: fromDate, lte: toDate } },
      include: { student: { select: { fullName: true, rollNo: true, class: { select: { name: true } } } } },
      orderBy: [{ date: "desc" }, { student: { rollNo: "asc" } }],
    });

    // Aggregate per student
    const map = new Map<string, { name: string; rollNo: string; className: string; present: number; absent: number; late: number; total: number }>();
    for (const r of records) {
      const key = r.studentId;
      if (!map.has(key)) map.set(key, { name: r.student?.fullName ?? r.studentId, rollNo: r.student?.rollNo ?? "", className: r.student?.class?.name ?? "", present: 0, absent: 0, late: 0, total: 0 });
      const s = map.get(key)!;
      s.total++;
      if (r.status === "PRESENT") s.present++;
      else if (r.status === "ABSENT") s.absent++;
      else if (r.status === "LATE") s.late++;
    }
    const rows = [...map.values()].map((s) => ({ ...s, pct: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0 }));

    if (format === "json") return rows;

    const cols = ["Roll No", "Name", "Class", "Present", "Absent", "Late", "Total", "% Attendance"];
    const dataRows = rows.map((r) => [r.rollNo, r.name, r.className, r.present, r.absent, r.late, r.total, `${r.pct}%`]);

    if (format === "excel") return buildExcel("Attendance Summary", cols, dataRows);

    const html = wrap(`Attendance Summary (${fromDate.toDateString()} – ${toDate.toDateString()})`, table(cols, dataRows));
    return renderPdf(html);
  }

  async getDefaulterList(schoolId: string, threshold = 75) {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 3, 1); // April 1
    const all = (await this.getAttendanceSummary(schoolId, startOfYear, today, "json")) as any[];
    return all.filter((s) => s.pct < threshold);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [2] FEE COLLECTION REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  async getFeeCollectionReport(schoolId: string, fromDate: Date, toDate: Date, format: "json" | "pdf" | "excel" = "json") {
    const payments = await this.prisma.feePayment.findMany({
      where: { schoolId, paidAt: { gte: fromDate, lte: toDate } },
      include: { invoice: { include: { student: { select: { fullName: true, rollNo: true } } } } },
      orderBy: { paidAt: "desc" },
    });

    const rows = payments.map((p) => ({
      date: p.paidAt?.toISOString().slice(0, 10) ?? "",
      studentName: p.invoice?.student?.fullName ?? "",
      rollNo: p.invoice?.student?.rollNo ?? "",
      amountRs: Number(p.amountRs),
      method: p.paymentMethod,
      txnRef: p.txnRef ?? "",
      invoiceId: p.invoiceId,
    }));

    const total = rows.reduce((s, r) => s + r.amountRs, 0);

    if (format === "json") return { rows, total };

    const cols = ["Date", "Student", "Roll No", "Amount (Rs)", "Method", "Txn Ref"];
    const dataRows = rows.map((r) => [r.date, r.studentName, r.rollNo, r.amountRs, r.method, r.txnRef]);
    dataRows.push(["", "", "TOTAL", total, "", ""]);

    if (format === "excel") return buildExcel("Fee Collection", cols, dataRows);

    const html = wrap(`Fee Collection Report (${fromDate.toDateString()} – ${toDate.toDateString()})`, table(cols, dataRows));
    return renderPdf(html);
  }

  async getFeeDefaulterReport(schoolId: string) {
    const invoices = await this.prisma.feeInvoice.findMany({
      where: { schoolId, status: { in: ["UNPAID", "PARTIAL"] } },
      include: { student: { select: { fullName: true, rollNo: true, class: { select: { name: true } } } } },
      orderBy: { dueDate: "asc" },
    });
    return invoices.map((inv) => ({
      studentName: inv.student?.fullName,
      rollNo: inv.student?.rollNo,
      className: inv.student?.class?.name,
      totalAmtRs: Number(inv.totalAmtRs),
      paidAmtRs: Number(inv.paidAmtRs ?? 0),
      dueAmtRs: Number(inv.totalAmtRs) - Number(inv.paidAmtRs ?? 0),
      dueDate: inv.dueDate?.toISOString().slice(0, 10),
      status: inv.status,
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [3] ACADEMIC PERFORMANCE REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  async getClassResultReport(classId: string, examId: string, format: "json" | "pdf" | "excel" = "json") {
    const results = await this.prisma.examResult.findMany({
      where: { classId, examId },
      include: {
        student: { select: { fullName: true, rollNo: true } },
        subject: { select: { name: true } },
      },
      orderBy: [{ student: { rollNo: "asc" } }, { subject: { name: "asc" } }],
    });

    // Pivot: student → subject → marks
    const studentMap = new Map<string, { name: string; rollNo: string; subjects: Record<string, number>; total: number; count: number }>();
    const subjectSet = new Set<string>();

    for (const r of results) {
      const key = r.studentId;
      subjectSet.add(r.subject?.name ?? r.subjectId);
      if (!studentMap.has(key)) studentMap.set(key, { name: r.student?.fullName ?? r.studentId, rollNo: r.student?.rollNo ?? "", subjects: {}, total: 0, count: 0 });
      const s = studentMap.get(key)!;
      s.subjects[r.subject?.name ?? r.subjectId] = Number(r.marksObtained);
      s.total += Number(r.marksObtained);
      s.count++;
    }

    const subjects = [...subjectSet].sort();
    const rows = [...studentMap.values()].map((s) => ({ ...s, avg: s.count > 0 ? Math.round(s.total / s.count) : 0 }));
    rows.sort((a, b) => b.avg - a.avg);
    rows.forEach((r, i) => (r as any).rank = i + 1);

    if (format === "json") return { subjects, rows };

    const cols = ["Rank", "Roll No", "Name", ...subjects, "Total", "Average %"];
    const dataRows = rows.map((r: any) => [r.rank, r.rollNo, r.name, ...subjects.map((s) => r.subjects[s] ?? "A"), r.total, `${r.avg}%`]);

    if (format === "excel") return buildExcel("Class Results", cols, dataRows);

    const html = wrap("Class Result Report", table(cols, dataRows));
    return renderPdf(html);
  }

  async getReportCard(studentId: string, examId: string): Promise<Buffer> {
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, include: { class: true } });
    const results = await this.prisma.examResult.findMany({
      where: { studentId, examId },
      include: { subject: { select: { name: true } }, exam: { select: { title: true, examType: true } } },
    });
    if (!student || results.length === 0) return Buffer.from("No data");

    const examTitle = results[0].exam?.title ?? examId;
    const subjectRows = results.map((r) => `<tr><td>${r.subject?.name}</td><td>${r.marksObtained}/${r.totalMarks}</td><td>${r.grade ?? ""}</td><td>${r.remarks ?? ""}</td></tr>`).join("");
    const total = results.reduce((s, r) => s + Number(r.marksObtained), 0);
    const maxTotal = results.reduce((s, r) => s + Number(r.totalMarks), 0);
    const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

    const html = wrap(`Report Card — ${student.fullName}`, `
      <p><strong>Class:</strong> ${student.class?.name} &nbsp;|&nbsp; <strong>Roll No:</strong> ${student.rollNo} &nbsp;|&nbsp; <strong>Exam:</strong> ${examTitle}</p>
      <table>
        <tr><th>Subject</th><th>Marks</th><th>Grade</th><th>Remarks</th></tr>
        ${subjectRows}
        <tr><td colspan="3"><strong>Total</strong></td><td><strong>${total}/${maxTotal} (${pct}%)</strong></td></tr>
      </table>
      <p style="margin-top:40px">Class Teacher Signature: _______________</p>
    `);
    return renderPdf(html);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [4] HR REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  async getStaffAttendanceSummary(schoolId: string, month: number, year: number, format: "json" | "excel" = "json") {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0); // last day of month
    const records = await this.prisma.staffAttendance.findMany({
      where: { schoolId, date: { gte: from, lte: to } },
      include: { staff: { select: { fullName: true, employeeCode: true, department: true } } },
      orderBy: { date: "asc" },
    });

    const map = new Map<string, any>();
    for (const r of records) {
      const key = r.staffId;
      if (!map.has(key)) map.set(key, { name: r.staff?.fullName, empCode: r.staff?.employeeCode, dept: r.staff?.department, present: 0, absent: 0, halfDay: 0, total: 0 });
      const s = map.get(key)!;
      s.total++;
      if (r.status === "PRESENT") s.present++;
      else if (r.status === "ABSENT") s.absent++;
      else if (r.status === "HALF_DAY") s.halfDay++;
    }
    const rows = [...map.values()];
    if (format === "json") return rows;

    const cols = ["Emp Code", "Name", "Department", "Present", "Absent", "Half Day", "Total"];
    return buildExcel("Staff Attendance", cols, rows.map((r) => [r.empCode, r.name, r.dept, r.present, r.absent, r.halfDay, r.total]));
  }

  async getPayslip(staffId: string, month: number, year: number): Promise<Buffer> {
    const payroll = await this.prisma.payrollRecord.findFirst({ where: { staffId, month, year } });
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!payroll || !staff) return Buffer.from("No payroll data");

    const html = wrap(`Payslip — ${staff.fullName} (${month}/${year})`, `
      <p><strong>Employee:</strong> ${staff.fullName} &nbsp;|&nbsp; <strong>Code:</strong> ${staff.employeeCode}</p>
      <table>
        <tr><th>Component</th><th>Amount (Rs)</th></tr>
        <tr><td>Basic Salary</td><td>${payroll.basicSalary}</td></tr>
        <tr><td>HRA</td><td>${payroll.hraRs ?? 0}</td></tr>
        <tr><td>DA</td><td>${payroll.daRs ?? 0}</td></tr>
        <tr><td>Other Allowances</td><td>${payroll.otherAllowancesRs ?? 0}</td></tr>
        <tr><td><strong>Gross Pay</strong></td><td><strong>${payroll.grossPayRs}</strong></td></tr>
        <tr><td>PF Deduction</td><td>(${payroll.pfDeductionRs ?? 0})</td></tr>
        <tr><td>ESI Deduction</td><td>(${payroll.esiDeductionRs ?? 0})</td></tr>
        <tr><td>TDS Deduction</td><td>(${payroll.tdsDeductionRs ?? 0})</td></tr>
        <tr><td>Other Deductions</td><td>(${payroll.otherDeductionsRs ?? 0})</td></tr>
        <tr><td><strong>Net Pay</strong></td><td><strong>${payroll.netPayRs}</strong></td></tr>
      </table>
      <p style="margin-top:40px">HR Signature: _______________ &nbsp;&nbsp; Employee Signature: _______________</p>
    `);
    return renderPdf(html);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [5] CUSTOM REPORT BUILDER
  // ═══════════════════════════════════════════════════════════════════════════

  async buildCustomReport(params: {
    model: "student" | "staff" | "feePayment" | "attendanceRecord" | "examResult";
    filters: Record<string, any>;
    fields: string[];
    format: "json" | "excel" | "pdf";
    title?: string;
  }) {
    const { model, filters, fields, format, title } = params;

    // Execute a dynamic Prisma query
    const data = await (this.prisma as any)[model].findMany({
      where: filters,
      select: fields.reduce((acc, f) => ({ ...acc, [f]: true }), {} as Record<string, boolean>),
    });

    if (format === "json") return data;

    const cols = fields;
    const rows = data.map((row: any) => fields.map((f) => row[f] ?? ""));

    if (format === "excel") return buildExcel(title ?? model, cols, rows);

    const html = wrap(title ?? model, table(cols, rows));
    return renderPdf(html);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [6] REAL-TIME OPS DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  async getOpsDashboard(schoolId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86_400_000);

    const [
      todayAttendance,
      pendingFees,
      openMaintenanceRequests,
      lowStockProducts,
      unclaimedLostItems,
      pendingLeaveRequests,
      activeAdmissions,
      overdueLibraryBooks,
    ] = await Promise.all([
      this.prisma.attendanceRecord.count({ where: { schoolId, date: { gte: today, lt: tomorrow }, status: "PRESENT" } }),
      this.prisma.feeInvoice.aggregate({ where: { schoolId, status: { in: ["UNPAID", "PARTIAL"] } }, _sum: { totalAmtRs: true } }),
      this.prisma.maintenanceRequest.count({ where: { schoolId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      this.prisma.storeProduct.findMany({ where: { schoolId, isActive: true } }).then((ps) => ps.filter((p) => p.stockQty <= p.reorderLevel).length),
      this.prisma.lostFoundItem.count({ where: { schoolId, status: "UNCLAIMED" } }),
      this.prisma.leaveRequest.count({ where: { schoolId, status: "PENDING" } }),
      this.prisma.application.count({ where: { schoolId, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
      this.prisma.bookIssue.count({ where: { schoolId, status: "ISSUED", dueDate: { lt: today } } }),
    ]);

    return {
      asOf: new Date().toISOString(),
      schoolId,
      attendance: { presentToday: todayAttendance },
      finance: { pendingFeesRs: Number(pendingFees._sum.totalAmtRs ?? 0) },
      facility: { openMaintenanceRequests },
      store: { lowStockProducts },
      lostFound: { unclaimedItems: unclaimedLostItems },
      hr: { pendingLeaveRequests },
      admissions: { activeAdmissions },
      library: { overdueBooks: overdueLibraryBooks },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [7] EXPENSE / BUDGET REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  async getBudgetVsActual(schoolId: string, academicYear: string, format: "json" | "excel" = "json") {
    const budgets = await this.prisma.budget.findMany({
      where: { schoolId, academicYear, status: "APPROVED" },
      include: {
        lineItems: {
          include: {
            expenses: { select: { amountRs: true } },
          },
        },
      },
    });

    const rows: any[] = [];
    for (const b of budgets) {
      for (const li of b.lineItems) {
        const spent = li.expenses.reduce((s: number, e: any) => s + Number(e.amountRs), 0);
        rows.push({ budget: b.title, category: li.category, allocated: Number(li.allocatedAmtRs), spent, variance: Number(li.allocatedAmtRs) - spent, pct: Number(li.allocatedAmtRs) > 0 ? Math.round((spent / Number(li.allocatedAmtRs)) * 100) : 0 });
      }
    }

    if (format === "json") return rows;

    const cols = ["Budget", "Category", "Allocated (Rs)", "Spent (Rs)", "Variance (Rs)", "% Utilised"];
    return buildExcel("Budget vs Actual", cols, rows.map((r) => [r.budget, r.category, r.allocated, r.spent, r.variance, `${r.pct}%`]));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [8] SCHOLARSHIP / CONCESSION REPORT
  // ═══════════════════════════════════════════════════════════════════════════

  async getScholarshipReport(schoolId: string, format: "json" | "excel" = "json") {
    const apps = await this.prisma.scholarshipApplication.findMany({
      where: { scheme: { schoolId } },
      include: {
        scheme: { select: { name: true, type: true } },
        student: { select: { fullName: true, rollNo: true, class: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = apps.map((a) => ({
      student: a.student?.fullName,
      rollNo: a.student?.rollNo,
      className: a.student?.class?.name,
      scheme: a.scheme?.name,
      type: a.scheme?.type,
      amountRs: Number(a.awardedAmtRs ?? 0),
      status: a.status,
      govtRef: a.govtPortalRefNo ?? "",
    }));

    if (format === "json") return rows;

    const cols = ["Student", "Roll No", "Class", "Scheme", "Type", "Amount (Rs)", "Status", "Govt Ref"];
    return buildExcel("Scholarship Report", cols, rows.map((r) => [r.student, r.rollNo, r.className, r.scheme, r.type, r.amountRs, r.status, r.govtRef]));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [9] ADMISSION FUNNEL REPORT
  // ═══════════════════════════════════════════════════════════════════════════

  async getAdmissionFunnel(schoolId: string, academicYear: string) {
    const apps = await this.prisma.application.findMany({ where: { schoolId, academicYear } });
    const funnel = {
      submitted: apps.filter((a) => a.status === "SUBMITTED").length,
      underReview: apps.filter((a) => a.status === "UNDER_REVIEW").length,
      shortlisted: apps.filter((a) => a.status === "SHORTLISTED").length,
      waitlisted: apps.filter((a) => a.status === "WAITLISTED").length,
      accepted: apps.filter((a) => a.status === "ACCEPTED").length,
      rejected: apps.filter((a) => a.status === "REJECTED").length,
      enrolled: apps.filter((a) => a.status === "ENROLLED").length,
      total: apps.length,
      conversionRate: apps.length > 0 ? Math.round((apps.filter((a) => a.status === "ENROLLED").length / apps.length) * 100) : 0,
    };
    return funnel;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [10] EXPORT — Fee Receipt
  // ═══════════════════════════════════════════════════════════════════════════

  async getFeeReceipt(paymentId: string): Promise<Buffer> {
    const payment = await this.prisma.feePayment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            student: { include: { class: true } },
            feeType: true,
          },
        },
      },
    });
    if (!payment) return Buffer.from("Payment not found");

    const student = payment.invoice?.student;
    const html = wrap("Fee Receipt", `
      <p><strong>Receipt No:</strong> ${payment.id.slice(-8).toUpperCase()} &nbsp;|&nbsp; <strong>Date:</strong> ${payment.paidAt?.toISOString().slice(0, 10)}</p>
      <p><strong>Student:</strong> ${student?.fullName} &nbsp;|&nbsp; <strong>Class:</strong> ${student?.class?.name} &nbsp;|&nbsp; <strong>Roll No:</strong> ${student?.rollNo}</p>
      <table>
        <tr><th>Description</th><th>Amount (Rs)</th></tr>
        <tr><td>${payment.invoice?.feeType?.name ?? "Fee"}</td><td>${payment.amountRs}</td></tr>
        <tr><td><strong>Total Paid</strong></td><td><strong>Rs ${payment.amountRs}/-</strong></td></tr>
      </table>
      <p>Payment Method: ${payment.paymentMethod} &nbsp;|&nbsp; Txn Ref: ${payment.txnRef ?? "N/A"}</p>
      <p style="margin-top:40px">Authorised Signatory: _______________</p>
    `);
    return renderPdf(html);
  }
}
