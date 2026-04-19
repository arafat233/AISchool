import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";

// ─── Pricing config ─────────────────────────────────────────────────────────
// Tiered slabs: { upTo: number (inclusive), pricePerStudent: number }
// Sorted ascending — billing uses the last matching slab
const TIERED_SLABS: Record<string, { upTo: number; pricePerStudent: number }[]> = {
  BASIC:      [{ upTo: 300, pricePerStudent: 55 }, { upTo: 600, pricePerStudent: 50 }, { upTo: Infinity, pricePerStudent: 45 }],
  STANDARD:   [{ upTo: 300, pricePerStudent: 110 }, { upTo: 600, pricePerStudent: 100 }, { upTo: Infinity, pricePerStudent: 90 }],
  PREMIUM:    [{ upTo: 300, pricePerStudent: 160 }, { upTo: 600, pricePerStudent: 150 }, { upTo: Infinity, pricePerStudent: 135 }],
  ENTERPRISE: [{ upTo: Infinity, pricePerStudent: 200 }],
};
const GST_RATE = 0.18; // 18% GST
const ANNUAL_DISCOUNT = 0.10; // 10% annual discount

function computeMonthlyBill(plan: string, studentCount: number, isAnnual = false): { base: number; gst: number; total: number } {
  const slabs = TIERED_SLABS[plan] ?? TIERED_SLABS["BASIC"];
  const slab = slabs.find((s) => studentCount <= s.upTo) ?? slabs[slabs.length - 1];
  let base = studentCount * slab.pricePerStudent;
  if (isAnnual) base = base * 12 * (1 - ANNUAL_DISCOUNT);
  const gst = Math.round(base * GST_RATE);
  return { base: Math.round(base), gst, total: Math.round(base + gst) };
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async generateMonthlyInvoice(tenantId: string, month: number, year: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, include: { schools: { select: { _count: { select: { students: true } } } } } });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);

    const studentCount = tenant.schools.reduce((s, sc) => s + sc._count.students, 0);
    const bill = computeMonthlyBill(tenant.plan, studentCount);

    const invoice = await this.prisma.saasInvoice.create({
      data: {
        tenantId,
        month,
        year,
        studentCount,
        plan: tenant.subscriptionPlan,
        baseAmtRs: bill.base,
        gstAmtRs: bill.gst,
        totalAmtRs: bill.total,
        status: "PENDING",
        dueDate: new Date(year, month, 10), // due on 10th of next month
      },
    });
    return invoice;
  }

  async listInvoices(tenantId?: string, status?: string) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    return this.prisma.saasInvoice.findMany({ where, orderBy: [{ year: "desc" }, { month: "desc" }] });
  }

  async recordPayment(invoiceId: string, method: "NACH" | "UPI" | "BANK_TRANSFER", txnRef: string) {
    const invoice = await this.prisma.saasInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);

    await this.prisma.saasInvoice.update({
      where: { id: invoiceId },
      data: { status: "PAID", paidAt: new Date(), paymentMethod: method, txnRef },
    });

    // Activate tenant if was trial/pending
    await this.prisma.tenant.update({
      where: { id: invoice.tenantId },
      data: { status: "ACTIVE" },
    });

    return { success: true, invoiceId, method, txnRef };
  }

  async getRevenueMtd() {
    const now = new Date();
    const invoices = await this.prisma.saasInvoice.findMany({
      where: { month: now.getMonth() + 1, year: now.getFullYear(), status: "PAID" },
    });
    const totalRevenueMtd = invoices.reduce((s, i) => s + Number(i.totalAmtRs), 0);

    const pending = await this.prisma.saasInvoice.aggregate({
      where: { status: "PENDING" },
      _sum: { totalAmtRs: true },
    });

    return { totalRevenueMtd, totalPendingFees: Number(pending._sum.totalAmtRs ?? 0) };
  }

  async getMonthlyRevenue() {
    const rows = await this.prisma.saasInvoice.groupBy({
      by: ["month", "year"],
      where: { status: "PAID" },
      _sum: { totalAmtRs: true },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return rows.map((r) => ({ month: MONTHS[r.month - 1], year: r.year, revenue: Number(r._sum.totalAmtRs ?? 0) }));
  }

  async getPlanBreakdown() {
    const rows = await this.prisma.saasInvoice.groupBy({
      by: ["plan"],
      where: { status: "PAID" },
      _sum: { totalAmtRs: true },
      _count: { tenantId: true },
    });
    return rows.map((r) => ({ plan: r.plan, revenue: Number(r._sum.totalAmtRs ?? 0), schools: r._count.tenantId }));
  }

  async getSaasMetrics() {
    const [revenueData, monthly, breakdown] = await Promise.all([
      this.getRevenueMtd(),
      this.getMonthlyRevenue(),
      this.getPlanBreakdown(),
    ]);

    const allInvoices = await this.prisma.saasInvoice.findMany({ where: { status: "PAID" }, orderBy: { createdAt: "asc" } });
    const mrr = revenueData.totalRevenueMtd;
    const arr = mrr * 12;

    // Churn rate: months with any churned tenant / total months
    const churnedCount = await this.prisma.tenant.count({ where: { status: "CHURNED" } });
    const totalTenants = await this.prisma.tenant.count();
    const churnRate = totalTenants > 0 ? parseFloat(((churnedCount / totalTenants) * 100).toFixed(1)) : 0;

    // NRR: simplified — (MRR + expansion - churn) / MRR prev * 100
    const prevMrr = monthly.length >= 2 ? monthly[monthly.length - 2].revenue : mrr;
    const nrr = prevMrr > 0 ? Math.round(((mrr / prevMrr) * 100)) : 100;

    // Students
    const schools = await this.prisma.school.findMany({ select: { _count: { select: { students: true } } } });
    const totalStudents = schools.reduce((s, sc) => s + sc._count.students, 0);

    const activeSchools = await this.prisma.tenant.count({ where: { status: { in: ["ACTIVE", "TRIAL"] as any[] } } });
    const revenuePerStudent = totalStudents > 0 ? Math.round(mrr / totalStudents) : 0;

    // LTV = average tenure * avg MRR per tenant
    const avgMrrPerTenant = activeSchools > 0 ? mrr / activeSchools : 0;
    const avgTenureMonths = 24; // assumed average
    const ltv = Math.round(avgMrrPerTenant * avgTenureMonths);
    const cac = 45000; // placeholder cost of acquisition

    return {
      mrr, arr, activeSchools, totalStudents, churnRate, nrr,
      ltv, cac, revenuePerStudent,
      monthlyData: monthly,
      planBreakdown: breakdown,
    };
  }

  async computeBillPreview(tenantId: string, isAnnual = false) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, include: { schools: { select: { _count: { select: { students: true } } } } } });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);
    const studentCount = tenant.schools.reduce((s, sc) => s + sc._count.students, 0);
    return { ...computeMonthlyBill(tenant.plan, studentCount, isAnnual), studentCount, plan: tenant.plan, isAnnual };
  }
}
