import { Test, TestingModule } from "@nestjs/testing";
import { AdvanceService } from "./advance.service";
import { NotFoundError, ConflictError } from "@school-erp/errors";

const mockPrisma = {
  salaryAdvance: {
    create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(),
    aggregate: jest.fn(),
  },
};

describe("AdvanceService", () => {
  let service: AdvanceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdvanceService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<AdvanceService>(AdvanceService);
  });

  describe("requestAdvance", () => {
    it("should create advance with correct EMI amount", async () => {
      mockPrisma.salaryAdvance.create.mockResolvedValueOnce({
        id: "adv-1", amount: 30000, emiAmount: 5000, repaymentMonths: 6, status: "PENDING",
      });
      const result = await service.requestAdvance({
        staffId: "staff-1", amount: 30000, reason: "Medical emergency", repaymentMonths: 6,
      });
      expect(result.emiAmount).toBe(5000);
      expect(result.status).toBe("PENDING");
      const createCall = mockPrisma.salaryAdvance.create.mock.calls[0][0];
      expect(createCall.data.emiAmount).toBe(5000); // 30000 / 6
    });

    it("should calculate EMI correctly for non-round amounts", async () => {
      mockPrisma.salaryAdvance.create.mockResolvedValueOnce({ id: "adv-2" });
      await service.requestAdvance({ staffId: "staff-1", amount: 10000, reason: "Fees", repaymentMonths: 3 });
      const createCall = mockPrisma.salaryAdvance.create.mock.calls[0][0];
      expect(createCall.data.emiAmount).toBeCloseTo(3333.33, 1);
    });
  });

  describe("approveAdvance", () => {
    it("should update status to ACTIVE", async () => {
      mockPrisma.salaryAdvance.findUnique.mockResolvedValueOnce({ id: "adv-1", status: "PENDING" });
      mockPrisma.salaryAdvance.update.mockResolvedValueOnce({ id: "adv-1", status: "ACTIVE" });
      const result = await service.approveAdvance("adv-1", "manager-1");
      expect(result.status).toBe("ACTIVE");
      const updateCall = mockPrisma.salaryAdvance.update.mock.calls[0][0];
      expect(updateCall.data.approvedAt).toBeInstanceOf(Date);
    });

    it("should throw NotFoundError when advance not found", async () => {
      mockPrisma.salaryAdvance.findUnique.mockResolvedValueOnce(null);
      await expect(service.approveAdvance("nonexistent", "manager-1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw ConflictError when advance is not PENDING", async () => {
      mockPrisma.salaryAdvance.findUnique.mockResolvedValueOnce({ id: "adv-1", status: "ACTIVE" });
      await expect(service.approveAdvance("adv-1", "manager-1")).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("getAdvances", () => {
    it("should filter by staffId when provided", async () => {
      mockPrisma.salaryAdvance.findMany.mockResolvedValueOnce([]);
      await service.getAdvances({ staffId: "staff-1" });
      expect(mockPrisma.salaryAdvance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ staffId: "staff-1" }) })
      );
    });
  });
});
