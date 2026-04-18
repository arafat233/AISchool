import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";

// ─── Constants ───────────────────────────────────────────────────────────────
const LARGE_PO_THRESHOLD_RS = 100_000; // amounts above this need Admin approval

// Helper: current financial year string e.g. "2024-25"
function currentFY(): string {
  const now = new Date();
  const yr = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  return month >= 4 ? `${yr}-${String(yr + 1).slice(2)}` : `${yr - 1}-${String(yr).slice(2)}`;
}

// Helper: quarter label for TDS
function tdsQuarter(date: Date): string {
  const m = date.getMonth() + 1;
  if (m >= 4 && m <= 6) return "Q1";
  if (m >= 7 && m <= 9) return "Q2";
  if (m >= 10 && m <= 12) return "Q3";
  return "Q4";
}

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // [1/12] Annual budget setup — department-wise, line items, approval, version control
  // ═══════════════════════════════════════════════════════════════════════════

  async createBudget(schoolId: string, createdBy: string, academicYear: string) {
    // Auto-increment version if a draft already exists
    const latest = await this.prisma.budget.findFirst({
      where: { schoolId, academicYear },
      orderBy: { version: "desc" },
    });
    const version = (latest?.version ?? 0) + 1;
    return this.prisma.budget.create({ data: { schoolId, academicYear, createdBy, version } });
  }

  async addBudgetLineItem(budgetId: string, data: { department: string; category: string; description?: string; allocatedAmt: number }) {
    const budget = await this.prisma.budget.findUnique({ where: { id: budgetId } });
    if (!budget) throw new NotFoundError("Budget not found");
    if (budget.status !== "DRAFT") throw new ConflictError("Budget is not in DRAFT — cannot edit");

    const item = await this.prisma.budgetLineItem.create({ data: { budgetId, ...data } });

    // Recalculate budget total
    const agg = await this.prisma.budgetLineItem.aggregate({ where: { budgetId }, _sum: { allocatedAmt: true } });
    await this.prisma.budget.update({ where: { id: budgetId }, data: { totalAmt: agg._sum.allocatedAmt ?? 0 } });

    return item;
  }

  async submitBudgetForApproval(budgetId: string) {
    return this.prisma.budget.update({ where: { id: budgetId }, data: { status: "PENDING_APPROVAL" } });
  }

  async approveBudget(budgetId: string, approvedBy: string) {
    return this.prisma.budget.update({
      where: { id: budgetId },
      data: { status: "APPROVED", approvedBy, approvedAt: new Date() },
    });
  }

  async rejectBudget(budgetId: string, rejectedBy: string, reason: string) {
    return this.prisma.budget.update({
      where: { id: budgetId },
      data: { status: "REJECTED", rejectedBy, rejectionReason: reason },
    });
  }

  async getBudget(schoolId: string, academicYear: string, version?: number) {
    const where = version
      ? { schoolId_academicYear_version: { schoolId, academicYear, version } }
      : undefined;

    if (where) return this.prisma.budget.findUnique({ where, include: { lineItems: true } });

    return this.prisma.budget.findFirst({
      where: { schoolId, academicYear },
      orderBy: { version: "desc" },
      include: { lineItems: true },
    });
  }

  async getBudgetLineItems(budgetId: string) {
    return this.prisma.budgetLineItem.findMany({ where: { budgetId }, orderBy: [{ department: "asc" }, { category: "asc" }] });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [2/12] Expense entry — petty cash, vendor payments, utilities, salaries
  // ═══════════════════════════════════════════════════════════════════════════

  async recordExpense(schoolId: string, recordedBy: string, data: {
    type: string; description: string; amountRs: number; gstAmountRs?: number;
    vendorId?: string; poId?: string; lineItemId?: string;
    paymentMode?: string; paymentDate: Date; receiptUrl?: string;
    // GST ITC fields (optional)
    invoiceNo?: string; vendorGstin?: string; hsnSac?: string;
    cgst?: number; sgst?: number; igst?: number;
  }) {
    const totalRs = data.amountRs + (data.gstAmountRs ?? 0);

    const expense = await this.prisma.expense.create({
      data: {
        schoolId, recordedBy,
        type: data.type, description: data.description,
        amountRs: data.amountRs, gstAmountRs: data.gstAmountRs,
        totalRs, vendorId: data.vendorId, poId: data.poId,
        lineItemId: data.lineItemId, paymentMode: data.paymentMode,
        paymentDate: data.paymentDate, receiptUrl: data.receiptUrl,
      },
    });

    // Update budget line item spent amount
    if (data.lineItemId) {
      await this.prisma.budgetLineItem.update({
        where: { id: data.lineItemId },
        data: { spentAmt: { increment: totalRs } },
      });
    }

    // Auto-create GST entry if GST fields provided
    if (data.invoiceNo && data.vendorGstin) {
      const gstTotal = (data.cgst ?? 0) + (data.sgst ?? 0) + (data.igst ?? 0);
      const period = `${data.paymentDate.getFullYear()}-${String(data.paymentDate.getMonth() + 1).padStart(2, "0")}`;
      await this.prisma.gstEntry.create({
        data: {
          schoolId, expenseId: expense.id,
          invoiceNo: data.invoiceNo, invoiceDate: data.paymentDate,
          vendorGstin: data.vendorGstin, hsnSac: data.hsnSac,
          taxableAmt: data.amountRs,
          cgst: data.cgst ?? 0, sgst: data.sgst ?? 0, igst: data.igst ?? 0,
          totalGst: gstTotal, period,
        },
      });
    }

    return expense;
  }

  async getExpenses(schoolId: string, type?: string, from?: Date, to?: Date, vendorId?: string) {
    return this.prisma.expense.findMany({
      where: {
        schoolId,
        ...(type ? { type } : {}),
        ...(vendorId ? { vendorId } : {}),
        ...(from || to ? { paymentDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: { gstEntry: true },
      orderBy: { paymentDate: "desc" },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [3/12] Purchase order workflow — request → HOD → Admin → PO → goods receipt → 3-way match → payment
  // ═══════════════════════════════════════════════════════════════════════════

  async createPO(schoolId: string, createdBy: string, data: {
    vendorId: string; description: string; amount: number; lineItemId?: string; requiredBy?: Date;
  }) {
    // Blacklist check
    const vendor = await this.prisma.vendor.findUnique({ where: { id: data.vendorId } });
    if (!vendor) throw new NotFoundError("Vendor not found");
    if (vendor.isBlacklisted) throw new ConflictError(`Vendor is blacklisted: ${vendor.blacklistReason ?? "no reason given"}`);

    const poNo = `PO-${schoolId.slice(0, 4).toUpperCase()}-${Date.now()}`;
    return this.prisma.purchaseOrder.create({
      data: { schoolId, createdBy, poNo, ...data, status: "DRAFT" },
    });
  }

  async submitPO(poId: string) {
    return this.prisma.purchaseOrder.update({ where: { id: poId }, data: { status: "SUBMITTED" } });
  }

  async hodApprovePO(poId: string, hodId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po || po.status !== "SUBMITTED") throw new ConflictError("PO not in SUBMITTED status");

    // If amount exceeds threshold, it still needs Admin approval
    const nextStatus = Number(po.amount) > LARGE_PO_THRESHOLD_RS ? "HOD_APPROVED" : "ADMIN_APPROVED";
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: nextStatus, hodApprovedBy: hodId, hodApprovedAt: new Date() },
    });
  }

  async adminApprovePO(poId: string, adminId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po || !["SUBMITTED", "HOD_APPROVED"].includes(po.status)) {
      throw new ConflictError("PO not ready for Admin approval");
    }
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: "ADMIN_APPROVED", adminApprovedBy: adminId, adminApprovedAt: new Date() },
    });
  }

  async issueOrderedPO(poId: string) {
    return this.prisma.purchaseOrder.update({ where: { id: poId }, data: { status: "ORDERED" } });
  }

  async recordGoodsReceipt(poId: string, receivedBy: string) {
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: "RECEIVED", goodsReceivedBy: receivedBy, goodsReceivedAt: new Date() },
    });
  }

  async matchInvoice(poId: string, invoiceNo: string, invoiceUrl: string, invoicedAmt: number) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po) throw new NotFoundError("PO not found");
    if (po.status !== "RECEIVED") throw new ConflictError("Goods must be received before invoice match");

    // 3-way match: PO amount ↔ invoice amount (±2%)
    const diff = Math.abs(Number(po.amount) - invoicedAmt) / Number(po.amount);
    const matchStatus = diff <= 0.02 ? "MATCHED" : "MISMATCH";

    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: "INVOICED", invoiceNo, invoiceUrl, invoiceMatchStatus: matchStatus },
    });
  }

  async payPO(poId: string, paymentDate: Date, paymentMode: string, netPayment: number, tdsDeducted = 0) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id: poId }, include: { vendor: true } });
    if (!po) throw new NotFoundError("PO not found");
    if (po.status !== "INVOICED") throw new ConflictError("Invoice must be matched before payment");

    await this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: "PAID", paymentDate, paymentMode, netPayment, tdsDeducted },
    });

    // Auto-generate TDS challan if vendor has TDS applicable
    if (po.vendor.tdsApplicable && tdsDeducted > 0) {
      await this.prisma.tdsChallan.create({
        data: {
          schoolId: po.schoolId, poId,
          vendorId: po.vendorId,
          section: po.vendor.tdsSection ?? "194C",
          baseAmtRs: po.amount,
          tdsRatePercent: po.vendor.tdsRate,
          tdsAmtRs: tdsDeducted,
          quarter: tdsQuarter(paymentDate),
          financialYear: currentFY(),
        },
      });
    }

    return po;
  }

  async getPOs(schoolId: string, status?: string, vendorId?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { schoolId, ...(status ? { status } : {}), ...(vendorId ? { vendorId } : {}) },
      include: { vendor: { select: { name: true, gstin: true } }, tdsChallans: true },
      orderBy: { createdAt: "desc" },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [4/12] Vendor management — GSTIN, bank details, categories, performance rating, blacklist
  // ═══════════════════════════════════════════════════════════════════════════

  async createVendor(schoolId: string, data: {
    name: string; category: string; contactName?: string; phone?: string; email?: string;
    address?: string; gstin?: string; panNo?: string; bankAccountNo?: string; bankIfsc?: string;
    tdsApplicable?: boolean; tdsSection?: string; tdsRate?: number;
  }) {
    return this.prisma.vendor.create({ data: { schoolId, ...data } });
  }

  async updateVendor(vendorId: string, data: Partial<{
    name: string; category: string; contactName: string; phone: string; email: string;
    gstin: string; panNo: string; bankAccountNo: string; bankIfsc: string;
    tdsApplicable: boolean; tdsSection: string; tdsRate: number; isActive: boolean;
  }>) {
    return this.prisma.vendor.update({ where: { id: vendorId }, data });
  }

  async rateVendor(vendorId: string, rating: number) {
    if (rating < 0 || rating > 5) throw new ConflictError("Rating must be between 0 and 5");
    return this.prisma.vendor.update({ where: { id: vendorId }, data: { performanceRating: rating } });
  }

  async blacklistVendor(vendorId: string, reason: string) {
    return this.prisma.vendor.update({ where: { id: vendorId }, data: { isBlacklisted: true, blacklistReason: reason } });
  }

  async unblacklistVendor(vendorId: string) {
    return this.prisma.vendor.update({ where: { id: vendorId }, data: { isBlacklisted: false, blacklistReason: null } });
  }

  async getVendors(schoolId: string, category?: string, blacklisted?: boolean) {
    return this.prisma.vendor.findMany({
      where: {
        schoolId,
        ...(category ? { category } : {}),
        ...(blacklisted !== undefined ? { isBlacklisted: blacklisted } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [5/12] Budget vs actual spend report — monthly + YTD, per department
  // ═══════════════════════════════════════════════════════════════════════════

  async getBudgetVsActual(schoolId: string, academicYear: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { schoolId, academicYear, status: "APPROVED" },
      orderBy: { version: "desc" },
      include: { lineItems: true },
    });
    if (!budget) throw new NotFoundError("No approved budget found for this academic year");

    const byDept: Record<string, { allocated: number; spent: number; variance: number; variancePct: number }> = {};

    for (const item of budget.lineItems) {
      if (!byDept[item.department]) {
        byDept[item.department] = { allocated: 0, spent: 0, variance: 0, variancePct: 0 };
      }
      byDept[item.department].allocated += Number(item.allocatedAmt);
      byDept[item.department].spent += Number(item.spentAmt);
    }

    for (const dept of Object.values(byDept)) {
      dept.variance = dept.allocated - dept.spent;
      dept.variancePct = dept.allocated > 0 ? Math.round((dept.variance / dept.allocated) * 100) : 0;
    }

    const totalAllocated = budget.lineItems.reduce((s, i) => s + Number(i.allocatedAmt), 0);
    const totalSpent = budget.lineItems.reduce((s, i) => s + Number(i.spentAmt), 0);

    return {
      budgetId: budget.id, academicYear, version: budget.version,
      totalAllocated, totalSpent, totalVariance: totalAllocated - totalSpent,
      utilizationPct: totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0,
      byDepartment: byDept,
      lineItems: budget.lineItems.map((i) => ({
        ...i,
        variance: Number(i.allocatedAmt) - Number(i.spentAmt),
        utilizationPct: Number(i.allocatedAmt) > 0 ? Math.round((Number(i.spentAmt) / Number(i.allocatedAmt)) * 100) : 0,
      })),
    };
  }

  async getMonthlySpend(schoolId: string, year: number) {
    // Group expenses by month
    const expenses = await this.prisma.expense.findMany({
      where: { schoolId, paymentDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
      select: { paymentDate: true, totalRs: true, type: true },
    });

    const monthly: Record<string, number> = {};
    for (const e of expenses) {
      const key = `${e.paymentDate.getFullYear()}-${String(e.paymentDate.getMonth() + 1).padStart(2, "0")}`;
      monthly[key] = (monthly[key] ?? 0) + Number(e.totalRs);
    }

    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, totalRs]) => ({ period, totalRs }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [6/12] GST ITC tracking — reconcile with GSTN
  // ═══════════════════════════════════════════════════════════════════════════

  async getITCSummary(schoolId: string, period: string) {
    const entries = await this.prisma.gstEntry.findMany({
      where: { schoolId, period },
      orderBy: { createdAt: "asc" },
    });

    const eligible = entries.filter((e) => e.itcEligible);
    const claimed = eligible.filter((e) => e.itcClaimed);
    const unclaimed = eligible.filter((e) => !e.itcClaimed);

    return {
      period,
      totalEntries: entries.length,
      totalTaxableAmt: entries.reduce((s, e) => s + Number(e.taxableAmt), 0),
      totalGst: entries.reduce((s, e) => s + Number(e.totalGst), 0),
      eligibleITC: eligible.reduce((s, e) => s + Number(e.totalGst), 0),
      claimedITC: claimed.reduce((s, e) => s + Number(e.totalGst), 0),
      unclaimedITC: unclaimed.reduce((s, e) => s + Number(e.totalGst), 0),
      entries,
    };
  }

  async markITCClaimed(gstEntryId: string) {
    return this.prisma.gstEntry.update({ where: { id: gstEntryId }, data: { itcClaimed: true } });
  }

  async getGstEntries(schoolId: string, period?: string, itcEligible?: boolean) {
    return this.prisma.gstEntry.findMany({
      where: {
        schoolId,
        ...(period ? { period } : {}),
        ...(itcEligible !== undefined ? { itcEligible } : {}),
      },
      orderBy: { invoiceDate: "asc" },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [7/12] GSTR-1 + GSTR-3B data export format
  // ═══════════════════════════════════════════════════════════════════════════

  async exportGSTR1(schoolId: string, period: string) {
    // GSTR-1 = outward supply (fee invoices with GST)
    // Here we export the summary structure that can be filed
    const entries = await this.prisma.gstEntry.findMany({
      where: { schoolId, period },
    });

    // B2B summary (vendor invoices with GSTIN)
    const b2b = entries
      .filter((e) => e.vendorGstin)
      .map((e) => ({
        gstin: e.vendorGstin,
        invoiceNo: e.invoiceNo,
        invoiceDate: e.invoiceDate.toISOString().slice(0, 10),
        taxableValue: Number(e.taxableAmt),
        cgst: Number(e.cgst),
        sgst: Number(e.sgst),
        igst: Number(e.igst),
        totalGst: Number(e.totalGst),
      }));

    return {
      gstReturnType: "GSTR-1",
      period,
      schoolId,
      generatedAt: new Date().toISOString(),
      b2bSupplies: b2b,
      totals: {
        taxableValue: b2b.reduce((s, e) => s + e.taxableValue, 0),
        totalGst: b2b.reduce((s, e) => s + e.totalGst, 0),
      },
    };
  }

  async exportGSTR3B(schoolId: string, period: string) {
    const entries = await this.prisma.gstEntry.findMany({ where: { schoolId, period } });

    const totalCgst = entries.reduce((s, e) => s + Number(e.cgst), 0);
    const totalSgst = entries.reduce((s, e) => s + Number(e.sgst), 0);
    const totalIgst = entries.reduce((s, e) => s + Number(e.igst), 0);
    const totalTaxable = entries.reduce((s, e) => s + Number(e.taxableAmt), 0);
    const itcAvailable = entries.filter((e) => e.itcEligible).reduce((s, e) => s + Number(e.totalGst), 0);
    const itcClaimed = entries.filter((e) => e.itcClaimed).reduce((s, e) => s + Number(e.totalGst), 0);

    return {
      gstReturnType: "GSTR-3B",
      period, schoolId,
      generatedAt: new Date().toISOString(),
      table3_1: { totalTaxable, cgst: totalCgst, sgst: totalSgst, igst: totalIgst },
      table4_ITC: { itcAvailable, itcClaimed, netITCUtilised: itcClaimed },
      netTaxPayable: Math.max(0, totalCgst + totalSgst + totalIgst - itcClaimed),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [8/12] TDS on vendor payments — 194C/194J, challan, Form 16A
  // ═══════════════════════════════════════════════════════════════════════════

  async getTDSChallans(schoolId: string, quarter?: string, financialYear?: string) {
    return this.prisma.tdsChallan.findMany({
      where: {
        schoolId,
        ...(quarter ? { quarter } : {}),
        ...(financialYear ? { financialYear } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async depositTDSChallan(challanId: string, challanNo: string) {
    return this.prisma.tdsChallan.update({
      where: { id: challanId },
      data: { challanNo, depositedAt: new Date() },
    });
  }

  async uploadForm16A(challanId: string, form16aUrl: string) {
    return this.prisma.tdsChallan.update({ where: { id: challanId }, data: { form16aUrl } });
  }

  async getTDSSummaryByVendor(schoolId: string, financialYear: string) {
    const challans = await this.prisma.tdsChallan.findMany({
      where: { schoolId, financialYear },
    });

    const byVendor: Record<string, { vendorId: string; section: string; baseAmt: number; tdsAmt: number; deposited: number; pending: number }> = {};
    for (const c of challans) {
      if (!byVendor[c.vendorId]) {
        byVendor[c.vendorId] = { vendorId: c.vendorId, section: c.section, baseAmt: 0, tdsAmt: 0, deposited: 0, pending: 0 };
      }
      byVendor[c.vendorId].baseAmt += Number(c.baseAmtRs);
      byVendor[c.vendorId].tdsAmt += Number(c.tdsAmtRs);
      if (c.depositedAt) byVendor[c.vendorId].deposited += Number(c.tdsAmtRs);
      else byVendor[c.vendorId].pending += Number(c.tdsAmtRs);
    }

    return Object.values(byVendor);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [9/12] Bank reconciliation — import statement, auto-match, flag unmatched, sign-off
  // ═══════════════════════════════════════════════════════════════════════════

  async importBankStatement(schoolId: string, data: {
    accountNo: string; bankName?: string; period: string; openingBal: number; closingBal: number;
    transactions: Array<{ txnDate: string; narration: string; amountRs: number; txnType: "DEBIT" | "CREDIT" }>;
  }) {
    const statement = await this.prisma.bankStatement.create({
      data: { schoolId, accountNo: data.accountNo, bankName: data.bankName, period: data.period, openingBal: data.openingBal, closingBal: data.closingBal },
    });

    await this.prisma.bankTxn.createMany({
      data: data.transactions.map((t) => ({
        statementId: statement.id,
        txnDate: new Date(t.txnDate),
        narration: t.narration,
        amountRs: t.amountRs,
        txnType: t.txnType,
      })),
    });

    // Auto-match: try to find fee payments or expense records
    await this._autoMatchTransactions(schoolId, statement.id);

    return this.prisma.bankStatement.findUnique({ where: { id: statement.id }, include: { _count: { select: { transactions: true } } } });
  }

  private async _autoMatchTransactions(schoolId: string, statementId: string) {
    const txns = await this.prisma.bankTxn.findMany({ where: { statementId, isMatched: false } });

    for (const txn of txns) {
      // Try to match with an expense by amount + date ± 2 days + narration keyword
      const dateFrom = new Date(txn.txnDate.getTime() - 2 * 86_400_000);
      const dateTo = new Date(txn.txnDate.getTime() + 2 * 86_400_000);

      if (txn.txnType === "DEBIT") {
        const expense = await this.prisma.expense.findFirst({
          where: {
            schoolId,
            totalRs: txn.amountRs,
            paymentDate: { gte: dateFrom, lte: dateTo },
          },
        });
        if (expense) {
          await this.prisma.bankTxn.update({
            where: { id: txn.id },
            data: { isMatched: true, matchedType: "EXPENSE", matchedRefId: expense.id, reconciledAt: new Date() },
          });
          continue;
        }
      }

      if (txn.txnType === "CREDIT") {
        // Try fee payment match by amount
        const feePayment = await this.prisma.feePayment.findFirst({
          where: { amountPaid: txn.amountRs, paidAt: { gte: dateFrom, lte: dateTo } },
        });
        if (feePayment) {
          await this.prisma.bankTxn.update({
            where: { id: txn.id },
            data: { isMatched: true, matchedType: "FEE_PAYMENT", matchedRefId: feePayment.id, reconciledAt: new Date() },
          });
        }
      }
    }
  }

  async getUnmatchedTransactions(statementId: string) {
    return this.prisma.bankTxn.findMany({ where: { statementId, isMatched: false }, orderBy: { txnDate: "asc" } });
  }

  async manualMatchTransaction(txnId: string, matchedType: string, matchedRefId: string) {
    return this.prisma.bankTxn.update({
      where: { id: txnId },
      data: { isMatched: true, matchedType, matchedRefId, reconciledAt: new Date() },
    });
  }

  async signOffReconciliation(schoolId: string, statementId: string, signedOffBy: string) {
    const txns = await this.prisma.bankTxn.findMany({ where: { statementId } });
    const matched = txns.filter((t) => t.isMatched).length;
    const unmatched = txns.length - matched;

    const recon = await this.prisma.bankRecon.create({
      data: { schoolId, statementId, signedOffBy, signedOffAt: new Date(), matchedCount: matched, unmatchedCount: unmatched },
    });

    await this.prisma.bankStatement.update({ where: { id: statementId }, data: { status: "RECONCILED" } });

    return { ...recon, totalTxns: txns.length, matched, unmatched };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [10/12] Cash denomination register — shifts, denominations, bank deposit, handover
  // ═══════════════════════════════════════════════════════════════════════════

  async openCashRegister(schoolId: string, cashierId: string, openingBalRs: number, denominations: Array<{ denomination: number; count: number }>) {
    // Verify opening balance matches denominations
    const calcBal = denominations.reduce((s, d) => s + d.denomination * d.count, 0);
    if (Math.abs(calcBal - openingBalRs) > 1) {
      throw new ConflictError(`Denomination total (${calcBal}) does not match opening balance (${openingBalRs})`);
    }

    return this.prisma.cashRegister.create({
      data: { schoolId, cashierId, shiftDate: new Date(), openingBalRs, openingDenoms: denominations },
    });
  }

  async recordCashTxn(registerId: string, data: { txnType: "RECEIPT" | "PAYMENT"; amountRs: number; description: string; denominations?: object[] }) {
    const reg = await this.prisma.cashRegister.findUnique({ where: { id: registerId } });
    if (!reg || reg.status !== "OPEN") throw new ConflictError("Cash register is not open");

    return this.prisma.cashTxn.create({ data: { registerId, ...data } });
  }

  async closeCashRegister(registerId: string, closingDenoms: Array<{ denomination: number; count: number }>, bankDepositRs?: number, depositSlipUrl?: string) {
    const txns = await this.prisma.cashTxn.findMany({ where: { registerId } });
    const reg = await this.prisma.cashRegister.findUnique({ where: { id: registerId } });
    if (!reg) throw new NotFoundError("Cash register not found");

    const receipts = txns.filter((t) => t.txnType === "RECEIPT").reduce((s, t) => s + Number(t.amountRs), 0);
    const payments = txns.filter((t) => t.txnType === "PAYMENT").reduce((s, t) => s + Number(t.amountRs), 0);
    const closingBalRs = Number(reg.openingBalRs) + receipts - payments;

    return this.prisma.cashRegister.update({
      where: { id: registerId },
      data: { closingBalRs, closingDenoms, bankDepositRs, depositSlipUrl, status: "CLOSED" },
    });
  }

  async handoverCashRegister(registerId: string, handedOverTo: string) {
    return this.prisma.cashRegister.update({
      where: { id: registerId },
      data: { handedOverTo, handoverSignedAt: new Date() },
    });
  }

  async getCashRegisters(schoolId: string, from?: Date, to?: Date) {
    return this.prisma.cashRegister.findMany({
      where: { schoolId, ...(from || to ? { shiftDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) },
      include: { transactions: true },
      orderBy: { shiftDate: "desc" },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [11/12] Revenue recognition — accrual, deferred revenue, month-end close, P&L
  // ═══════════════════════════════════════════════════════════════════════════

  async recordRevenue(schoolId: string, data: {
    studentId?: string; description: string; amountRs: number; revenueType: string;
    recognitionDate: Date; isDeferred?: boolean; deferralEndDate?: Date; academicYear: string;
  }) {
    const period = `${data.recognitionDate.getFullYear()}-${String(data.recognitionDate.getMonth() + 1).padStart(2, "0")}`;
    return this.prisma.revenueEntry.create({ data: { schoolId, ...data, period } });
  }

  async recognizeDeferredRevenue(schoolId: string, period: string) {
    // Find deferred entries whose deferralEndDate has passed
    const now = new Date();
    const deferredToRecognize = await this.prisma.revenueEntry.findMany({
      where: { schoolId, isDeferred: true, deferralEndDate: { lte: now } },
    });

    // Mark as recognized by updating isDeferred = false
    const ids = deferredToRecognize.map((e) => e.id);
    if (ids.length > 0) {
      await this.prisma.revenueEntry.updateMany({ where: { id: { in: ids } }, data: { isDeferred: false } });
    }

    return { recognizedCount: ids.length, entries: deferredToRecognize };
  }

  async closeMonth(schoolId: string, period: string, closedBy: string, notes?: string) {
    const [revenue, expenses] = await Promise.all([
      this.prisma.revenueEntry.aggregate({ where: { schoolId, period, isDeferred: false }, _sum: { amountRs: true } }),
      this.prisma.expense.aggregate({ where: { schoolId, paymentDate: { gte: new Date(`${period}-01`), lt: new Date(new Date(`${period}-01`).setMonth(new Date(`${period}-01`).getMonth() + 1)) } }, _sum: { totalRs: true } }),
    ]);

    const totalRevenue = Number(revenue._sum.amountRs ?? 0);
    const totalExpense = Number(expenses._sum.totalRs ?? 0);
    const netPL = totalRevenue - totalExpense;

    return this.prisma.monthEndClose.upsert({
      where: { schoolId_period: { schoolId, period } },
      create: { schoolId, period, closedBy, closedAt: new Date(), totalRevenue, totalExpense, netPL, notes },
      update: { closedBy, closedAt: new Date(), totalRevenue, totalExpense, netPL, notes },
    });
  }

  async getPLReport(schoolId: string, fromPeriod: string, toPeriod: string) {
    const closes = await this.prisma.monthEndClose.findMany({
      where: { schoolId, period: { gte: fromPeriod, lte: toPeriod } },
      orderBy: { period: "asc" },
    });

    const totalRevenue = closes.reduce((s, c) => s + Number(c.totalRevenue), 0);
    const totalExpense = closes.reduce((s, c) => s + Number(c.totalExpense), 0);

    return {
      fromPeriod, toPeriod,
      totalRevenue, totalExpense, netPL: totalRevenue - totalExpense,
      monthly: closes,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [12/12] Vendor self-service portal — invoices, payment status, disputes, compliance docs
  // ═══════════════════════════════════════════════════════════════════════════

  async submitVendorInvoice(vendorId: string, data: {
    poId?: string; invoiceNo: string; invoiceDate: Date; amountRs: number; gstAmountRs?: number; invoiceUrl?: string;
  }) {
    // Verify vendor exists and not blacklisted
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundError("Vendor not found");
    if (vendor.isBlacklisted) throw new ConflictError("Vendor is blacklisted — invoice cannot be submitted");

    return this.prisma.vendorInvoice.create({ data: { vendorId, ...data } });
  }

  async approveVendorInvoice(invoiceId: string, approvedBy: string) {
    return this.prisma.vendorInvoice.update({
      where: { id: invoiceId },
      data: { status: "APPROVED", approvedBy, approvedAt: new Date() },
    });
  }

  async markVendorInvoicePaid(invoiceId: string, paymentRef: string) {
    return this.prisma.vendorInvoice.update({
      where: { id: invoiceId },
      data: { status: "PAID", paidAt: new Date(), paymentRef },
    });
  }

  async raiseDispute(invoiceId: string, reason: string, attachmentUrl?: string) {
    await this.prisma.vendorInvoice.update({ where: { id: invoiceId }, data: { status: "DISPUTED" } });
    return this.prisma.vendorDispute.create({ data: { invoiceId, reason, attachmentUrl } });
  }

  async resolveDispute(disputeId: string, resolvedBy: string) {
    const dispute = await this.prisma.vendorDispute.update({
      where: { id: disputeId },
      data: { status: "RESOLVED", resolvedBy, resolvedAt: new Date() },
    });
    await this.prisma.vendorInvoice.update({ where: { id: dispute.invoiceId }, data: { status: "APPROVED" } });
    return dispute;
  }

  async uploadVendorComplianceDoc(invoiceId: string, docUrl: string, docType: string) {
    const inv = await this.prisma.vendorInvoice.findUnique({ where: { id: invoiceId } });
    if (!inv) throw new NotFoundError("Vendor invoice not found");

    const docs = (inv.complianceDocs as Array<{ url: string; type: string; uploadedAt: string }>) ?? [];
    docs.push({ url: docUrl, type: docType, uploadedAt: new Date().toISOString() });

    return this.prisma.vendorInvoice.update({ where: { id: invoiceId }, data: { complianceDocs: docs } });
  }

  async getVendorInvoices(vendorId: string, status?: string) {
    return this.prisma.vendorInvoice.findMany({
      where: { vendorId, ...(status ? { status } : {}) },
      include: { disputes: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getSchoolVendorInvoices(schoolId: string, status?: string) {
    const vendors = await this.prisma.vendor.findMany({ where: { schoolId }, select: { id: true } });
    const vendorIds = vendors.map((v) => v.id);

    return this.prisma.vendorInvoice.findMany({
      where: { vendorId: { in: vendorIds }, ...(status ? { status } : {}) },
      include: { vendor: { select: { name: true } }, disputes: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
