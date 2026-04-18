import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ExpenseService } from "./expense.service";

@UseGuards(AuthGuard("jwt"))
@Controller("expense")
export class ExpenseController {
  constructor(private readonly svc: ExpenseService) {}

  // ─── [1] Budget ───────────────────────────────────────────────────────────

  @Post(":schoolId/budgets")
  createBudget(@Param("schoolId") schoolId: string, @Body() body: { createdBy: string; academicYear: string }) {
    return this.svc.createBudget(schoolId, body.createdBy, body.academicYear);
  }

  @Post("budgets/:budgetId/line-items")
  addLineItem(@Param("budgetId") budgetId: string, @Body() body: { department: string; category: string; description?: string; allocatedAmt: number }) {
    return this.svc.addBudgetLineItem(budgetId, body);
  }

  @Patch("budgets/:budgetId/submit")
  submitBudget(@Param("budgetId") budgetId: string) {
    return this.svc.submitBudgetForApproval(budgetId);
  }

  @Patch("budgets/:budgetId/approve")
  approveBudget(@Param("budgetId") budgetId: string, @Body() body: { approvedBy: string }) {
    return this.svc.approveBudget(budgetId, body.approvedBy);
  }

  @Patch("budgets/:budgetId/reject")
  rejectBudget(@Param("budgetId") budgetId: string, @Body() body: { rejectedBy: string; reason: string }) {
    return this.svc.rejectBudget(budgetId, body.rejectedBy, body.reason);
  }

  @Get(":schoolId/budgets")
  getBudget(@Param("schoolId") schoolId: string, @Query("academicYear") academicYear: string, @Query("version") version?: string) {
    return this.svc.getBudget(schoolId, academicYear, version ? parseInt(version) : undefined);
  }

  @Get("budgets/:budgetId/line-items")
  getLineItems(@Param("budgetId") budgetId: string) {
    return this.svc.getBudgetLineItems(budgetId);
  }

  // ─── [2] Expense entry ────────────────────────────────────────────────────

  @Post(":schoolId/expenses")
  recordExpense(
    @Param("schoolId") schoolId: string,
    @Body() body: any,
  ) {
    return this.svc.recordExpense(schoolId, body.recordedBy, { ...body, paymentDate: new Date(body.paymentDate) });
  }

  @Get(":schoolId/expenses")
  getExpenses(
    @Param("schoolId") schoolId: string,
    @Query("type") type?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("vendorId") vendorId?: string,
  ) {
    return this.svc.getExpenses(schoolId, type, from ? new Date(from) : undefined, to ? new Date(to) : undefined, vendorId);
  }

  // ─── [3] Purchase orders ──────────────────────────────────────────────────

  @Post(":schoolId/purchase-orders")
  createPO(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.createPO(schoolId, body.createdBy, { ...body, requiredBy: body.requiredBy ? new Date(body.requiredBy) : undefined });
  }

  @Patch("purchase-orders/:poId/submit")
  submitPO(@Param("poId") poId: string) {
    return this.svc.submitPO(poId);
  }

  @Patch("purchase-orders/:poId/hod-approve")
  hodApprovePO(@Param("poId") poId: string, @Body() body: { hodId: string }) {
    return this.svc.hodApprovePO(poId, body.hodId);
  }

  @Patch("purchase-orders/:poId/admin-approve")
  adminApprovePO(@Param("poId") poId: string, @Body() body: { adminId: string }) {
    return this.svc.adminApprovePO(poId, body.adminId);
  }

  @Patch("purchase-orders/:poId/order")
  issueOrderedPO(@Param("poId") poId: string) {
    return this.svc.issueOrderedPO(poId);
  }

  @Patch("purchase-orders/:poId/receive")
  recordGoodsReceipt(@Param("poId") poId: string, @Body() body: { receivedBy: string }) {
    return this.svc.recordGoodsReceipt(poId, body.receivedBy);
  }

  @Patch("purchase-orders/:poId/match-invoice")
  matchInvoice(@Param("poId") poId: string, @Body() body: { invoiceNo: string; invoiceUrl: string; invoicedAmt: number }) {
    return this.svc.matchInvoice(poId, body.invoiceNo, body.invoiceUrl, body.invoicedAmt);
  }

  @Patch("purchase-orders/:poId/pay")
  payPO(@Param("poId") poId: string, @Body() body: { paymentDate: string; paymentMode: string; netPayment: number; tdsDeducted?: number }) {
    return this.svc.payPO(poId, new Date(body.paymentDate), body.paymentMode, body.netPayment, body.tdsDeducted);
  }

  @Get(":schoolId/purchase-orders")
  getPOs(@Param("schoolId") schoolId: string, @Query("status") status?: string, @Query("vendorId") vendorId?: string) {
    return this.svc.getPOs(schoolId, status, vendorId);
  }

  // ─── [4] Vendor management ────────────────────────────────────────────────

  @Post(":schoolId/vendors")
  createVendor(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.createVendor(schoolId, body);
  }

  @Patch("vendors/:vendorId")
  updateVendor(@Param("vendorId") vendorId: string, @Body() body: any) {
    return this.svc.updateVendor(vendorId, body);
  }

  @Patch("vendors/:vendorId/rate")
  rateVendor(@Param("vendorId") vendorId: string, @Body() body: { rating: number }) {
    return this.svc.rateVendor(vendorId, body.rating);
  }

  @Patch("vendors/:vendorId/blacklist")
  blacklistVendor(@Param("vendorId") vendorId: string, @Body() body: { reason: string }) {
    return this.svc.blacklistVendor(vendorId, body.reason);
  }

  @Patch("vendors/:vendorId/unblacklist")
  unblacklistVendor(@Param("vendorId") vendorId: string) {
    return this.svc.unblacklistVendor(vendorId);
  }

  @Get(":schoolId/vendors")
  getVendors(@Param("schoolId") schoolId: string, @Query("category") category?: string, @Query("blacklisted") blacklisted?: string) {
    return this.svc.getVendors(schoolId, category, blacklisted !== undefined ? blacklisted === "true" : undefined);
  }

  // ─── [5] Budget vs actual ─────────────────────────────────────────────────

  @Get(":schoolId/reports/budget-vs-actual")
  getBudgetVsActual(@Param("schoolId") schoolId: string, @Query("academicYear") academicYear: string) {
    return this.svc.getBudgetVsActual(schoolId, academicYear);
  }

  @Get(":schoolId/reports/monthly-spend")
  getMonthlySpend(@Param("schoolId") schoolId: string, @Query("year") year: string) {
    return this.svc.getMonthlySpend(schoolId, parseInt(year));
  }

  // ─── [6] GST ITC ─────────────────────────────────────────────────────────

  @Get(":schoolId/gst/itc-summary")
  getITCSummary(@Param("schoolId") schoolId: string, @Query("period") period: string) {
    return this.svc.getITCSummary(schoolId, period);
  }

  @Patch("gst/entries/:gstEntryId/claim-itc")
  markITCClaimed(@Param("gstEntryId") gstEntryId: string) {
    return this.svc.markITCClaimed(gstEntryId);
  }

  @Get(":schoolId/gst/entries")
  getGstEntries(@Param("schoolId") schoolId: string, @Query("period") period?: string, @Query("itcEligible") itcEligible?: string) {
    return this.svc.getGstEntries(schoolId, period, itcEligible !== undefined ? itcEligible === "true" : undefined);
  }

  // ─── [7] GSTR export ─────────────────────────────────────────────────────

  @Get(":schoolId/gst/gstr1")
  exportGSTR1(@Param("schoolId") schoolId: string, @Query("period") period: string) {
    return this.svc.exportGSTR1(schoolId, period);
  }

  @Get(":schoolId/gst/gstr3b")
  exportGSTR3B(@Param("schoolId") schoolId: string, @Query("period") period: string) {
    return this.svc.exportGSTR3B(schoolId, period);
  }

  // ─── [8] TDS ─────────────────────────────────────────────────────────────

  @Get(":schoolId/tds/challans")
  getTDSChallans(@Param("schoolId") schoolId: string, @Query("quarter") quarter?: string, @Query("fy") fy?: string) {
    return this.svc.getTDSChallans(schoolId, quarter, fy);
  }

  @Patch("tds/challans/:challanId/deposit")
  depositTDSChallan(@Param("challanId") challanId: string, @Body() body: { challanNo: string }) {
    return this.svc.depositTDSChallan(challanId, body.challanNo);
  }

  @Patch("tds/challans/:challanId/form16a")
  uploadForm16A(@Param("challanId") challanId: string, @Body() body: { form16aUrl: string }) {
    return this.svc.uploadForm16A(challanId, body.form16aUrl);
  }

  @Get(":schoolId/tds/summary")
  getTDSSummaryByVendor(@Param("schoolId") schoolId: string, @Query("fy") fy: string) {
    return this.svc.getTDSSummaryByVendor(schoolId, fy);
  }

  // ─── [9] Bank reconciliation ─────────────────────────────────────────────

  @Post(":schoolId/bank/import")
  importBankStatement(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.importBankStatement(schoolId, body);
  }

  @Get("bank/statements/:statementId/unmatched")
  getUnmatchedTransactions(@Param("statementId") statementId: string) {
    return this.svc.getUnmatchedTransactions(statementId);
  }

  @Patch("bank/txns/:txnId/match")
  manualMatchTransaction(@Param("txnId") txnId: string, @Body() body: { matchedType: string; matchedRefId: string }) {
    return this.svc.manualMatchTransaction(txnId, body.matchedType, body.matchedRefId);
  }

  @Post(":schoolId/bank/statements/:statementId/sign-off")
  signOffReconciliation(@Param("schoolId") schoolId: string, @Param("statementId") statementId: string, @Body() body: { signedOffBy: string }) {
    return this.svc.signOffReconciliation(schoolId, statementId, body.signedOffBy);
  }

  // ─── [10] Cash register ───────────────────────────────────────────────────

  @Post(":schoolId/cash/registers")
  openCashRegister(@Param("schoolId") schoolId: string, @Body() body: { cashierId: string; openingBalRs: number; denominations: Array<{ denomination: number; count: number }> }) {
    return this.svc.openCashRegister(schoolId, body.cashierId, body.openingBalRs, body.denominations);
  }

  @Post("cash/registers/:registerId/txns")
  recordCashTxn(@Param("registerId") registerId: string, @Body() body: { txnType: "RECEIPT" | "PAYMENT"; amountRs: number; description: string; denominations?: object[] }) {
    return this.svc.recordCashTxn(registerId, body);
  }

  @Patch("cash/registers/:registerId/close")
  closeCashRegister(@Param("registerId") registerId: string, @Body() body: { closingDenoms: Array<{ denomination: number; count: number }>; bankDepositRs?: number; depositSlipUrl?: string }) {
    return this.svc.closeCashRegister(registerId, body.closingDenoms, body.bankDepositRs, body.depositSlipUrl);
  }

  @Patch("cash/registers/:registerId/handover")
  handoverCashRegister(@Param("registerId") registerId: string, @Body() body: { handedOverTo: string }) {
    return this.svc.handoverCashRegister(registerId, body.handedOverTo);
  }

  @Get(":schoolId/cash/registers")
  getCashRegisters(@Param("schoolId") schoolId: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.getCashRegisters(schoolId, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  // ─── [11] Revenue recognition ─────────────────────────────────────────────

  @Post(":schoolId/revenue")
  recordRevenue(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.recordRevenue(schoolId, { ...body, recognitionDate: new Date(body.recognitionDate), deferralEndDate: body.deferralEndDate ? new Date(body.deferralEndDate) : undefined });
  }

  @Post(":schoolId/revenue/recognize-deferred")
  recognizeDeferredRevenue(@Param("schoolId") schoolId: string, @Query("period") period: string) {
    return this.svc.recognizeDeferredRevenue(schoolId, period);
  }

  @Post(":schoolId/month-end/close")
  closeMonth(@Param("schoolId") schoolId: string, @Body() body: { period: string; closedBy: string; notes?: string }) {
    return this.svc.closeMonth(schoolId, body.period, body.closedBy, body.notes);
  }

  @Get(":schoolId/reports/pl")
  getPLReport(@Param("schoolId") schoolId: string, @Query("from") from: string, @Query("to") to: string) {
    return this.svc.getPLReport(schoolId, from, to);
  }

  // ─── [12] Vendor self-service ─────────────────────────────────────────────

  @Post("vendor-portal/:vendorId/invoices")
  submitVendorInvoice(@Param("vendorId") vendorId: string, @Body() body: any) {
    return this.svc.submitVendorInvoice(vendorId, { ...body, invoiceDate: new Date(body.invoiceDate) });
  }

  @Patch("vendor-portal/invoices/:invoiceId/approve")
  approveVendorInvoice(@Param("invoiceId") invoiceId: string, @Body() body: { approvedBy: string }) {
    return this.svc.approveVendorInvoice(invoiceId, body.approvedBy);
  }

  @Patch("vendor-portal/invoices/:invoiceId/paid")
  markVendorInvoicePaid(@Param("invoiceId") invoiceId: string, @Body() body: { paymentRef: string }) {
    return this.svc.markVendorInvoicePaid(invoiceId, body.paymentRef);
  }

  @Post("vendor-portal/invoices/:invoiceId/dispute")
  raiseDispute(@Param("invoiceId") invoiceId: string, @Body() body: { reason: string; attachmentUrl?: string }) {
    return this.svc.raiseDispute(invoiceId, body.reason, body.attachmentUrl);
  }

  @Patch("vendor-portal/disputes/:disputeId/resolve")
  resolveDispute(@Param("disputeId") disputeId: string, @Body() body: { resolvedBy: string }) {
    return this.svc.resolveDispute(disputeId, body.resolvedBy);
  }

  @Post("vendor-portal/invoices/:invoiceId/compliance-docs")
  uploadComplianceDoc(@Param("invoiceId") invoiceId: string, @Body() body: { docUrl: string; docType: string }) {
    return this.svc.uploadVendorComplianceDoc(invoiceId, body.docUrl, body.docType);
  }

  @Get("vendor-portal/:vendorId/invoices")
  getVendorInvoices(@Param("vendorId") vendorId: string, @Query("status") status?: string) {
    return this.svc.getVendorInvoices(vendorId, status);
  }

  @Get(":schoolId/vendor-portal/invoices")
  getSchoolVendorInvoices(@Param("schoolId") schoolId: string, @Query("status") status?: string) {
    return this.svc.getSchoolVendorInvoices(schoolId, status);
  }
}
