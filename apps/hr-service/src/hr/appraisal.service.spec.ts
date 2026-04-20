import { Test, TestingModule } from "@nestjs/testing";
import { AppraisalService } from "./appraisal.service";
import { NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  staffAppraisal: {
    create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(),
  },
};

describe("AppraisalService", () => {
  let service: AppraisalService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppraisalService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<AppraisalService>(AppraisalService);
  });

  describe("createAppraisal", () => {
    it("should create appraisal in SELF_ASSESSMENT stage", async () => {
      mockPrisma.staffAppraisal.create.mockResolvedValueOnce({ id: "ap-1", stage: "SELF_ASSESSMENT" });
      const result = await service.createAppraisal({
        staffId: "staff-1", academicYearId: "ay-1",
        kras: [{ title: "Teaching Quality", weightage: 40 }],
      });
      expect(result.stage).toBe("SELF_ASSESSMENT");
    });
  });

  describe("getAppraisal", () => {
    it("should return appraisal when found", async () => {
      mockPrisma.staffAppraisal.findUnique.mockResolvedValueOnce({ id: "ap-1" });
      const result = await service.getAppraisal("ap-1");
      expect(result.id).toBe("ap-1");
    });

    it("should throw NotFoundError when not found", async () => {
      mockPrisma.staffAppraisal.findUnique.mockResolvedValueOnce(null);
      await expect(service.getAppraisal("nonexistent")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("submitSelfAssessment", () => {
    it("should advance stage to HOD_REVIEW", async () => {
      mockPrisma.staffAppraisal.update.mockResolvedValueOnce({ id: "ap-1", stage: "HOD_REVIEW" });
      const result = await service.submitSelfAssessment("ap-1", [
        { kraTitle: "Teaching Quality", score: 4 },
      ]);
      expect(result.stage).toBe("HOD_REVIEW");
      const updateCall = mockPrisma.staffAppraisal.update.mock.calls[0][0];
      expect(updateCall.data.stage).toBe("HOD_REVIEW");
      expect(updateCall.data.selfSubmittedAt).toBeInstanceOf(Date);
    });
  });

  describe("submitHodReview", () => {
    it("should advance stage to PRINCIPAL_SIGNOFF", async () => {
      mockPrisma.staffAppraisal.update.mockResolvedValueOnce({ id: "ap-1", stage: "PRINCIPAL_SIGNOFF" });
      const result = await service.submitHodReview("ap-1", "hod-1", [
        { kraTitle: "Teaching Quality", score: 3 },
      ], "Good performance");
      expect(result.stage).toBe("PRINCIPAL_SIGNOFF");
    });
  });

  describe("listAppraisals", () => {
    it("should filter by staffId when provided", async () => {
      mockPrisma.staffAppraisal.findMany.mockResolvedValueOnce([]);
      await service.listAppraisals("staff-1");
      expect(mockPrisma.staffAppraisal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ staffId: "staff-1" }) })
      );
    });
  });
});
