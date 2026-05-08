import { Test, TestingModule } from "@nestjs/testing";
import { ExpenseController } from "./expense.controller";
import { ExpenseService } from "./expense.service";

const mockExpenseService = {
  createBudget: jest.fn(),
  addBudgetLineItem: jest.fn(),
  submitBudgetForApproval: jest.fn(),
  approveBudget: jest.fn(),
  rejectBudget: jest.fn(),
  getBudget: jest.fn(),
  getBudgetLineItems: jest.fn(),
  recordExpense: jest.fn(),
  getExpenses: jest.fn(),
  createPO: jest.fn(),
  submitPO: jest.fn(),
  hodApprovePO: jest.fn(),
  adminApprovePO: jest.fn(),
  issueOrderedPO: jest.fn(),
  recordGoodsReceipt: jest.fn(),
  matchInvoice: jest.fn(),
  payPO: jest.fn(),
  getPOs: jest.fn(),
  createVendor: jest.fn(),
  updateVendor: jest.fn(),
  rateVendor: jest.fn(),
  blacklistVendor: jest.fn(),
  unblacklistVendor: jest.fn(),
  getVendors: jest.fn(),
  getBudgetVsActual: jest.fn(),
  getMonthlySpend: jest.fn(),
  getITCSummary: jest.fn(),
  markITCClaimed: jest.fn(),
  getGstEntries: jest.fn(),
  exportGSTR1: jest.fn(),
  exportGSTR3B: jest.fn(),
  getTDSChallans: jest.fn(),
  depositTDSChallan: jest.fn(),
  uploadForm16A: jest.fn(),
  getTDSSummaryByVendor: jest.fn(),
  importBankStatement: jest.fn(),
  getUnmatchedTransactions: jest.fn(),
  manualMatchTransaction: jest.fn(),
  signOffReconciliation: jest.fn(),
  openCashRegister: jest.fn(),
  recordCashTxn: jest.fn(),
  closeCashRegister: jest.fn(),
  handoverCashRegister: jest.fn(),
  getCashRegisters: jest.fn(),
  recordRevenue: jest.fn(),
  recognizeDeferredRevenue: jest.fn(),
  closeMonth: jest.fn(),
  getPLReport: jest.fn(),
  submitVendorInvoice: jest.fn(),
  approveVendorInvoice: jest.fn(),
  markVendorInvoicePaid: jest.fn(),
  raiseDispute: jest.fn(),
  resolveDispute: jest.fn(),
  uploadVendorComplianceDoc: jest.fn(),
  getVendorInvoices: jest.fn(),
  getSchoolVendorInvoices: jest.fn(),
};

describe("ExpenseController", () => {
  let controller: ExpenseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpenseController],
      providers: [{ provide: ExpenseService, useValue: mockExpenseService }],
    })
      .overrideGuard(require("@nestjs/passport").AuthGuard("jwt"))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExpenseController>(ExpenseController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ─── Budget ────────────────────────────────────────────────────────────────

  describe("createBudget", () => {
    it("calls service with schoolId from param", async () => {
      const budget = { id: "b1" };
      mockExpenseService.createBudget.mockResolvedValue(budget);
      const result = await controller.createBudget("school1", { createdBy: "user1", academicYear: "2025-26" });
      expect(result).toEqual(budget);
      expect(mockExpenseService.createBudget).toHaveBeenCalledWith("school1", "user1", "2025-26");
    });

    it("propagates service errors", async () => {
      mockExpenseService.createBudget.mockRejectedValue(new Error("DB error"));
      await expect(
        controller.createBudget("school1", { createdBy: "u", academicYear: "2025-26" }),
      ).rejects.toThrow("DB error");
    });
  });

  describe("approveBudget", () => {
    it("calls service with budgetId and approvedBy", async () => {
      mockExpenseService.approveBudget.mockResolvedValue({ id: "b1", status: "APPROVED" });
      await controller.approveBudget("b1", { approvedBy: "admin1" });
      expect(mockExpenseService.approveBudget).toHaveBeenCalledWith("b1", "admin1");
    });
  });

  describe("rejectBudget", () => {
    it("calls service with budgetId, rejectedBy, and reason", async () => {
      mockExpenseService.rejectBudget.mockResolvedValue({ id: "b1", status: "REJECTED" });
      await controller.rejectBudget("b1", { rejectedBy: "admin1", reason: "Over budget" });
      expect(mockExpenseService.rejectBudget).toHaveBeenCalledWith("b1", "admin1", "Over budget");
    });
  });

  describe("getBudget", () => {
    it("returns budget with parsed version", async () => {
      const budget = { id: "b1" };
      mockExpenseService.getBudget.mockResolvedValue(budget);
      const result = await controller.getBudget("school1", "2025-26", "2");
      expect(result).toEqual(budget);
      expect(mockExpenseService.getBudget).toHaveBeenCalledWith("school1", "2025-26", 2);
    });
  });

  // ─── Expenses ──────────────────────────────────────────────────────────────

  describe("recordExpense", () => {
    it("calls service with schoolId from param", async () => {
      const expense = { id: "exp1" };
      mockExpenseService.recordExpense.mockResolvedValue(expense);
      const body = { recordedBy: "user1", paymentDate: "2025-01-01", category: "UTILITIES", amountRs: 5000 } as any;
      expect(await controller.recordExpense("school1", body)).toEqual(expense);
      expect(mockExpenseService.recordExpense).toHaveBeenCalledWith(
        "school1",
        "user1",
        expect.objectContaining({ amountRs: 5000 }),
      );
    });
  });

  describe("getExpenses", () => {
    it("returns expenses for schoolId", async () => {
      const expenses = [{ id: "exp1" }];
      mockExpenseService.getExpenses.mockResolvedValue(expenses);
      const result = await controller.getExpenses("school1", "UTILITIES");
      expect(result).toEqual(expenses);
    });
  });

  // ─── Purchase Orders ───────────────────────────────────────────────────────

  describe("submitPO", () => {
    it("delegates to service with poId", async () => {
      mockExpenseService.submitPO.mockResolvedValue({ id: "po1", status: "SUBMITTED" });
      await controller.submitPO("po1");
      expect(mockExpenseService.submitPO).toHaveBeenCalledWith("po1");
    });
  });

  describe("adminApprovePO", () => {
    it("calls service with poId and adminId", async () => {
      mockExpenseService.adminApprovePO.mockResolvedValue({ id: "po1" });
      await controller.adminApprovePO("po1", { adminId: "admin1" });
      expect(mockExpenseService.adminApprovePO).toHaveBeenCalledWith("po1", "admin1");
    });
  });

  describe("payPO", () => {
    it("calls service with parsed payment date", async () => {
      mockExpenseService.payPO.mockResolvedValue({ id: "po1", status: "PAID" });
      const body = { paymentDate: "2025-06-01", paymentMode: "NEFT", netPayment: 10000 };
      await controller.payPO("po1", body);
      expect(mockExpenseService.payPO).toHaveBeenCalledWith(
        "po1",
        expect.any(Date),
        "NEFT",
        10000,
        undefined,
      );
    });
  });

  // ─── Vendors ───────────────────────────────────────────────────────────────

  describe("createVendor", () => {
    it("creates vendor with schoolId from param", async () => {
      const vendor = { id: "v1" };
      mockExpenseService.createVendor.mockResolvedValue(vendor);
      const body = { name: "Acme Corp", category: "STATIONERY" } as any;
      expect(await controller.createVendor("school1", body)).toEqual(vendor);
      expect(mockExpenseService.createVendor).toHaveBeenCalledWith("school1", body);
    });
  });

  describe("blacklistVendor", () => {
    it("calls service with vendorId and reason", async () => {
      mockExpenseService.blacklistVendor.mockResolvedValue({ id: "v1", blacklisted: true });
      await controller.blacklistVendor("v1", { reason: "Fraud" });
      expect(mockExpenseService.blacklistVendor).toHaveBeenCalledWith("v1", "Fraud");
    });
  });

  // ─── Reports ───────────────────────────────────────────────────────────────

  describe("getBudgetVsActual", () => {
    it("returns report for schoolId and academicYear", async () => {
      const report = { surplus: 5000 };
      mockExpenseService.getBudgetVsActual.mockResolvedValue(report);
      const result = await controller.getBudgetVsActual("school1", "2025-26");
      expect(result).toEqual(report);
      expect(mockExpenseService.getBudgetVsActual).toHaveBeenCalledWith("school1", "2025-26");
    });
  });

  // ─── GST ───────────────────────────────────────────────────────────────────

  describe("markITCClaimed", () => {
    it("delegates to service", async () => {
      mockExpenseService.markITCClaimed.mockResolvedValue({ id: "gst1", itcClaimed: true });
      await controller.markITCClaimed("gst1");
      expect(mockExpenseService.markITCClaimed).toHaveBeenCalledWith("gst1");
    });
  });

  // ─── Cash ──────────────────────────────────────────────────────────────────

  describe("openCashRegister", () => {
    it("calls service with schoolId from param", async () => {
      const register = { id: "reg1" };
      mockExpenseService.openCashRegister.mockResolvedValue(register);
      const body = { cashierId: "c1", openingBalRs: 5000, denominations: [] };
      expect(await controller.openCashRegister("school1", body)).toEqual(register);
    });
  });

  // ─── Vendor Self-Service ───────────────────────────────────────────────────

  describe("submitVendorInvoice", () => {
    it("passes vendorId and invoice data to service", async () => {
      const invoice = { id: "inv1" };
      mockExpenseService.submitVendorInvoice.mockResolvedValue(invoice);
      const body = { invoiceNo: "INV001", invoiceDate: "2025-01-15", amountRs: 10000 } as any;
      expect(await controller.submitVendorInvoice("v1", body)).toEqual(invoice);
    });
  });

  // ─── Health ────────────────────────────────────────────────────────────────

  describe("health", () => {
    it("returns ok status", () => {
      expect(controller.health()).toEqual({ status: "ok", service: "expense-service" });
    });
  });
});
