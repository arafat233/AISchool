import { Test, TestingModule } from "@nestjs/testing";
import { ScholarshipService } from "./scholarship.service";
import { NotFoundError, ConflictError } from "@school-erp/errors";

const mockPrisma = {
  scholarshipScheme: { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  scholarshipApplication: {
    count: jest.fn(), upsert: jest.fn(), update: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
  },
  scholarshipReview: { upsert: jest.fn(), update: jest.fn() },
  attendanceRecord: { count: jest.fn() },
  result: { findMany: jest.fn() },
  student: { findUnique: jest.fn() },
  feeInvoice: { findFirst: jest.fn(), update: jest.fn() },
  concession: { create: jest.fn() },
  $transaction: jest.fn(),
};

describe("ScholarshipService", () => {
  let service: ScholarshipService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScholarshipService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<ScholarshipService>(ScholarshipService);
  });

  describe("createScheme", () => {
    it("should create scheme with PERCENTAGE discount type by default", async () => {
      mockPrisma.scholarshipScheme.create.mockResolvedValueOnce({ id: "scheme-1", discountType: "PERCENTAGE" });
      const result = await service.createScheme("sch-1", { name: "Merit", type: "MERIT", discountValue: 50 });
      expect(result.id).toBe("scheme-1");
      const call = mockPrisma.scholarshipScheme.create.mock.calls[0][0];
      expect(call.data.discountType).toBe("PERCENTAGE");
    });

    it("should set feeHeadIds to empty array by default", async () => {
      mockPrisma.scholarshipScheme.create.mockResolvedValueOnce({ id: "scheme-2" });
      await service.createScheme("sch-1", { name: "Sports", type: "SPORTS", discountValue: 30 });
      const call = mockPrisma.scholarshipScheme.create.mock.calls[0][0];
      expect(call.data.feeHeadIds).toEqual([]);
    });
  });

  describe("applyForScholarship", () => {
    it("should throw NotFoundError when scheme not found", async () => {
      mockPrisma.scholarshipScheme.findUnique.mockResolvedValueOnce(null);
      await expect(service.applyForScholarship("scheme-1", "stu-1", "ay-1", [])).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should throw ConflictError when scheme is inactive", async () => {
      mockPrisma.scholarshipScheme.findUnique.mockResolvedValueOnce({ id: "scheme-1", isActive: false, eligibilityCriteria: {} });
      await expect(service.applyForScholarship("scheme-1", "stu-1", "ay-1", [])).rejects.toBeInstanceOf(ConflictError);
    });

    it("should throw ConflictError when seats are full", async () => {
      mockPrisma.scholarshipScheme.findUnique.mockResolvedValueOnce({
        id: "scheme-1", isActive: true, maxBeneficiaries: 5, eligibilityCriteria: {},
      });
      mockPrisma.scholarshipApplication.count.mockResolvedValueOnce(5);
      await expect(service.applyForScholarship("scheme-1", "stu-1", "ay-1", [])).rejects.toBeInstanceOf(ConflictError);
    });

    it("should create application with PENDING status when eligible", async () => {
      mockPrisma.scholarshipScheme.findUnique.mockResolvedValueOnce({
        id: "scheme-1", isActive: true, maxBeneficiaries: null, eligibilityCriteria: {},
      });
      mockPrisma.scholarshipApplication.upsert.mockResolvedValueOnce({ id: "app-1", status: "PENDING" });
      const result = await service.applyForScholarship("scheme-1", "stu-1", "ay-1", []);
      expect(result.status).toBe("PENDING");
    });
  });

  describe("finalApprove", () => {
    it("should update application status to APPROVED", async () => {
      mockPrisma.scholarshipApplication.findUnique.mockResolvedValueOnce({
        id: "app-1", scheme: { name: "Merit" },
      });
      mockPrisma.scholarshipApplication.update.mockResolvedValueOnce({ id: "app-1", status: "APPROVED" });
      const result = await service.finalApprove("app-1", "admin-1", "APPROVED");
      expect(result.status).toBe("APPROVED");
    });

    it("should throw NotFoundError when application not found", async () => {
      mockPrisma.scholarshipApplication.findUnique.mockResolvedValueOnce(null);
      await expect(service.finalApprove("nonexistent", "admin-1", "APPROVED")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("getApplications", () => {
    it("should filter by status when provided", async () => {
      mockPrisma.scholarshipApplication.findMany.mockResolvedValueOnce([]);
      await service.getApplications("scheme-1", "PENDING");
      expect(mockPrisma.scholarshipApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "PENDING" }) })
      );
    });
  });

  describe("submitReview", () => {
    it("should compute totalScore from rubricScores", async () => {
      mockPrisma.scholarshipReview.update.mockResolvedValueOnce({ id: "review-1", totalScore: 85 });
      await service.submitReview("app-1", "reviewer-1", { academic: 50, financial: 35 }, "APPROVE");
      const call = mockPrisma.scholarshipReview.update.mock.calls[0][0];
      expect(call.data.totalScore).toBe(85);
    });
  });
});
