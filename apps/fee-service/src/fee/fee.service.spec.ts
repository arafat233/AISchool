import { Test, TestingModule } from "@nestjs/testing";
import { FeeService } from "./fee.service";

jest.mock("@school-erp/utils", () => ({
  rupeesToPaise: (r: number) => r * 100,
  paiseToRupees: (p: number) => p / 100,
  formatINR: (p: number) => `₹${p / 100}`,
  calculateLateFee: jest.fn().mockReturnValue(0),
}));

const mockPrisma = {
  feeHead: { create: jest.fn(), findMany: jest.fn() },
  feeStructure: { upsert: jest.fn(), findMany: jest.fn() },
  feeInvoice: { findFirst: jest.fn(), create: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  feePayment: { create: jest.fn(), aggregate: jest.fn() },
  student: { findMany: jest.fn() },
  $transaction: jest.fn(),
};

const mockRazorpay = {
  createOrder: jest.fn(),
  verifySignature: jest.fn(),
};

describe("FeeService", () => {
  let service: FeeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeeService,
        { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma },
        { provide: require("../payment/razorpay.service").RazorpayService, useValue: mockRazorpay },
      ],
    }).compile();
    service = module.get<FeeService>(FeeService);
  });

  describe("createFeeHead", () => {
    it("should create a fee head for the school", async () => {
      mockPrisma.feeHead.create.mockResolvedValueOnce({ id: "fh-1", name: "Tuition" });
      const result = await service.createFeeHead("sch-1", { name: "Tuition" });
      expect(result.id).toBe("fh-1");
    });
  });

  describe("recordCashPayment", () => {
    it("should create payment and mark invoice PAID when fully paid", async () => {
      mockPrisma.feeInvoice.findUniqueOrThrow.mockResolvedValueOnce({ id: "inv-1", totalAmount: 50000 }); // Rs 500 in paise
      mockPrisma.feePayment.aggregate.mockResolvedValueOnce({ _sum: { amountPaid: 0 } });
      mockPrisma.feePayment.create.mockResolvedValueOnce({ id: "pay-1", amountPaid: 50000 });
      mockPrisma.feeInvoice.update.mockResolvedValueOnce({ id: "inv-1", status: "PAID" });

      const result = await service.recordCashPayment("inv-1", { amountPaid: 500, receivedById: "cashier-1" });
      expect(result.id).toBe("pay-1");
      expect(mockPrisma.feeInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "PAID" } })
      );
    });

    it("should mark invoice PARTIALLY_PAID when only partial amount received", async () => {
      mockPrisma.feeInvoice.findUniqueOrThrow.mockResolvedValueOnce({ id: "inv-1", totalAmount: 50000 });
      mockPrisma.feePayment.aggregate.mockResolvedValueOnce({ _sum: { amountPaid: 0 } });
      mockPrisma.feePayment.create.mockResolvedValueOnce({ id: "pay-1" });
      mockPrisma.feeInvoice.update.mockResolvedValueOnce({ id: "inv-1", status: "PARTIALLY_PAID" });

      await service.recordCashPayment("inv-1", { amountPaid: 200, receivedById: "cashier-1" });
      expect(mockPrisma.feeInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "PARTIALLY_PAID" } })
      );
    });

    it("should throw BusinessRuleError when payment exceeds outstanding balance", async () => {
      mockPrisma.feeInvoice.findUniqueOrThrow.mockResolvedValueOnce({ id: "inv-1", totalAmount: 50000 });
      mockPrisma.feePayment.aggregate.mockResolvedValueOnce({ _sum: { amountPaid: 40000 } });
      // outstanding = 10000 paise = Rs 100; paying Rs 200 = 20000 paise → overpayment
      await expect(service.recordCashPayment("inv-1", { amountPaid: 200, receivedById: "cashier-1" }))
        .rejects.toMatchObject({ code: "OVERPAYMENT" });
    });
  });

  describe("createRazorpayOrder", () => {
    it("should return orderId with outstanding amount", async () => {
      mockPrisma.feeInvoice.findUniqueOrThrow.mockResolvedValueOnce({ id: "inv-1", totalAmount: 50000 });
      mockPrisma.feePayment.aggregate.mockResolvedValueOnce({ _sum: { amountPaid: 0 } });
      mockRazorpay.createOrder.mockResolvedValueOnce({ id: "order_xyz123" });

      const result = await service.createRazorpayOrder("inv-1");
      expect(result.orderId).toBe("order_xyz123");
      expect(result.amount).toBe(50000);
    });

    it("should throw BusinessRuleError when invoice is already fully paid", async () => {
      mockPrisma.feeInvoice.findUniqueOrThrow.mockResolvedValueOnce({ id: "inv-1", totalAmount: 50000 });
      mockPrisma.feePayment.aggregate.mockResolvedValueOnce({ _sum: { amountPaid: 50000 } });
      await expect(service.createRazorpayOrder("inv-1")).rejects.toMatchObject({ code: "ALREADY_PAID" });
    });
  });

  describe("getFeeHeads", () => {
    it("should return fee heads ordered by name", async () => {
      mockPrisma.feeHead.findMany.mockResolvedValueOnce([
        { id: "fh-1", name: "Activities" },
        { id: "fh-2", name: "Tuition" },
      ]);
      const result = await service.getFeeHeads("sch-1");
      expect(result).toHaveLength(2);
    });
  });
});
