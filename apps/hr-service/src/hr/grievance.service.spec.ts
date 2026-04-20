import { Test, TestingModule } from "@nestjs/testing";
import { GrievanceService } from "./grievance.service";

const mockPrisma = {
  staffGrievance: { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
};

describe("GrievanceService", () => {
  let service: GrievanceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [GrievanceService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<GrievanceService>(GrievanceService);
  });

  describe("submitGrievance", () => {
    it("should create grievance with OPEN status", async () => {
      mockPrisma.staffGrievance.create.mockResolvedValueOnce({ id: "gr-1", status: "OPEN", priority: "MEDIUM" });
      const result = await service.submitGrievance({
        schoolId: "sch-1", staffId: "staff-1", category: "SALARY", description: "Salary not paid",
      });
      expect(result.status).toBe("OPEN");
    });

    it("should not store staffId for anonymous grievance", async () => {
      mockPrisma.staffGrievance.create.mockResolvedValueOnce({ id: "gr-2", staffId: null, isAnonymous: true });
      await service.submitGrievance({
        schoolId: "sch-1", staffId: "staff-1", category: "HARASSMENT",
        description: "Uncomfortable environment", isAnonymous: true,
      });
      const createCall = mockPrisma.staffGrievance.create.mock.calls[0][0];
      expect(createCall.data.staffId).toBeNull();
    });
  });

  describe("assignGrievance", () => {
    it("should assign and set deadline 7 days from now by default", async () => {
      mockPrisma.staffGrievance.update.mockResolvedValueOnce({ id: "gr-1", status: "IN_PROGRESS" });
      await service.assignGrievance("gr-1", "hr-manager-1");
      const updateCall = mockPrisma.staffGrievance.update.mock.calls[0][0];
      const deadline = updateCall.data.resolutionDeadline as Date;
      const diff = deadline.getTime() - Date.now();
      expect(diff).toBeGreaterThan(6 * 86400000);
      expect(diff).toBeLessThan(8 * 86400000);
    });
  });

  describe("resolveGrievance", () => {
    it("should update status to RESOLVED with resolution text", async () => {
      mockPrisma.staffGrievance.update.mockResolvedValueOnce({ id: "gr-1", status: "RESOLVED" });
      const result = await service.resolveGrievance("gr-1", "Issue addressed with HR");
      expect(result.status).toBe("RESOLVED");
      const updateCall = mockPrisma.staffGrievance.update.mock.calls[0][0];
      expect(updateCall.data.resolution).toBe("Issue addressed with HR");
      expect(updateCall.data.resolvedAt).toBeInstanceOf(Date);
    });
  });
});
