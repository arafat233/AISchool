import { Test, TestingModule } from "@nestjs/testing";
import { AdmissionService } from "./admission.service";
import { NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  enquiry: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  enquiryFollowUp: { create: jest.fn() },
  admissionApplication: { create: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  admissionDocument: { create: jest.fn() },
  $transaction: jest.fn(),
};

describe("AdmissionService", () => {
  let service: AdmissionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdmissionService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<AdmissionService>(AdmissionService);
  });

  describe("createEnquiry", () => {
    it("should create enquiry with OPEN status", async () => {
      mockPrisma.enquiry.create.mockResolvedValueOnce({ id: "enq-1", status: "OPEN", source: "WALK_IN" });
      const result = await service.createEnquiry("sch-1", {
        studentName: "Rahul Sharma", parentName: "Mr Sharma",
        parentPhone: "9876543210",
      });
      expect(result.status).toBe("OPEN");
    });

    it("should default source to WALK_IN", async () => {
      mockPrisma.enquiry.create.mockResolvedValueOnce({ id: "enq-1" });
      await service.createEnquiry("sch-1", {
        studentName: "Priya", parentName: "Mrs Priya", parentPhone: "123",
      });
      const createCall = mockPrisma.enquiry.create.mock.calls[0][0];
      expect(createCall.data.source).toBe("WALK_IN");
    });
  });

  describe("getEnquiry", () => {
    it("should return enquiry when found", async () => {
      mockPrisma.enquiry.findUnique.mockResolvedValueOnce({ id: "enq-1" });
      const result = await service.getEnquiry("enq-1");
      expect(result.id).toBe("enq-1");
    });

    it("should throw NotFoundError when not found", async () => {
      mockPrisma.enquiry.findUnique.mockResolvedValueOnce(null);
      await expect(service.getEnquiry("nonexistent")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("addFollowUp", () => {
    it("should create follow-up log and update enquiry", async () => {
      mockPrisma.enquiry.findUnique.mockResolvedValueOnce({ id: "enq-1" });
      mockPrisma.$transaction.mockImplementationOnce(async (ops: any[]) => {
        return Promise.all(ops.map(op => typeof op === 'function' ? op() : Promise.resolve(op)));
      });
      await service.addFollowUp("enq-1", {
        channel: "PHONE", outcome: "Interested", loggedBy: "counsellor-1",
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should throw NotFoundError when enquiry not found", async () => {
      mockPrisma.enquiry.findUnique.mockResolvedValueOnce(null);
      await expect(service.addFollowUp("nonexistent", {
        channel: "EMAIL", outcome: "No response", loggedBy: "counsellor-1",
      })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("createApplication", () => {
    it("should generate sequential application number", async () => {
      mockPrisma.admissionApplication.count.mockResolvedValueOnce(5);
      mockPrisma.admissionApplication.create.mockResolvedValueOnce({
        id: "app-1", applicationNo: `ADM-${new Date().getFullYear()}-0006`,
      });
      const result = await service.createApplication("sch-1", {
        studentName: "Ravi", parentName: "Mr Ravi", parentPhone: "123",
        applyingForGrade: "Grade 1",
      });
      expect(result.applicationNo).toContain("ADM-");
      expect(result.applicationNo).toContain("0006");
    });
  });

  describe("getEnquiries", () => {
    it("should filter by status when provided", async () => {
      mockPrisma.enquiry.findMany.mockResolvedValueOnce([]);
      await service.getEnquiries("sch-1", "OPEN");
      expect(mockPrisma.enquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "OPEN" }) })
      );
    });
  });
});
