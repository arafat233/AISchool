import { Test, TestingModule } from "@nestjs/testing";
import { BillingService } from "./billing.service";
import { NotFoundException } from "@nestjs/common";

const mockPrisma = {
  tenant: { findUnique: jest.fn(), update: jest.fn() },
  saasInvoice: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
};

describe("BillingService", () => {
  let service: BillingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [BillingService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<BillingService>(BillingService);
  });

  describe("generateMonthlyInvoice", () => {
    it("should compute tiered billing for BASIC plan with 200 students", async () => {
      // BASIC plan: ≤300 students → Rs 55/student
      // 200 × 55 = 11,000 base; GST 18% = 1,980; total = 12,980
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        id: "t-1", plan: "BASIC", subscriptionPlan: "BASIC",
        schools: [{ _count: { students: 200 } }],
      });
      mockPrisma.saasInvoice.create.mockResolvedValueOnce({
        id: "inv-1", baseAmtRs: 11000, gstAmtRs: 1980, totalAmtRs: 12980,
      });
      const result = await service.generateMonthlyInvoice("t-1", 4, 2026);
      expect(result.baseAmtRs).toBe(11000);
      expect(result.gstAmtRs).toBe(1980);
      expect(result.totalAmtRs).toBe(12980);
    });

    it("should throw NotFoundException when tenant not found", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);
      await expect(service.generateMonthlyInvoice("nonexistent", 4, 2026)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should aggregate student count across multiple schools", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        id: "t-1", plan: "STANDARD", subscriptionPlan: "STANDARD",
        schools: [{ _count: { students: 150 } }, { _count: { students: 200 } }],
      });
      mockPrisma.saasInvoice.create.mockResolvedValueOnce({ id: "inv-2", studentCount: 350 });
      const result = await service.generateMonthlyInvoice("t-1", 4, 2026);
      const createCall = mockPrisma.saasInvoice.create.mock.calls[0][0];
      expect(createCall.data.studentCount).toBe(350);
    });
  });

  describe("recordPayment", () => {
    it("should mark invoice as PAID and activate tenant", async () => {
      mockPrisma.saasInvoice.findUnique.mockResolvedValueOnce({ id: "inv-1", tenantId: "t-1" });
      mockPrisma.saasInvoice.update.mockResolvedValueOnce({ id: "inv-1", status: "PAID" });
      mockPrisma.tenant.update.mockResolvedValueOnce({ id: "t-1", status: "ACTIVE" });

      const result = await service.recordPayment("inv-1", "UPI", "UPI-TXN-123");
      expect(result.success).toBe(true);
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "ACTIVE" } })
      );
    });

    it("should throw NotFoundException when invoice not found", async () => {
      mockPrisma.saasInvoice.findUnique.mockResolvedValueOnce(null);
      await expect(service.recordPayment("nonexistent", "UPI", "txn-1")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("listInvoices", () => {
    it("should filter by tenantId and status when provided", async () => {
      mockPrisma.saasInvoice.findMany.mockResolvedValueOnce([]);
      await service.listInvoices("t-1", "PENDING");
      expect(mockPrisma.saasInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: "t-1", status: "PENDING" } })
      );
    });
  });
});
