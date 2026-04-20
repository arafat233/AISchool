import { Test, TestingModule } from "@nestjs/testing";
import { RecruitmentService } from "./recruitment.service";
import { NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  jobVacancy: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  jobApplication: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  interviewSchedule: { create: jest.fn() },
};

describe("RecruitmentService", () => {
  let service: RecruitmentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecruitmentService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<RecruitmentService>(RecruitmentService);
  });

  describe("createVacancy", () => {
    it("should create vacancy with OPEN status", async () => {
      mockPrisma.jobVacancy.create.mockResolvedValueOnce({ id: "vac-1", status: "OPEN" });
      const result = await service.createVacancy("sch-1", {
        title: "Science Teacher", designationId: "des-1", requiredCount: 2,
      });
      expect(result.status).toBe("OPEN");
    });
  });

  describe("applyForVacancy", () => {
    it("should create application when vacancy is OPEN", async () => {
      mockPrisma.jobVacancy.findUnique.mockResolvedValueOnce({ id: "vac-1", status: "OPEN" });
      mockPrisma.jobApplication.create.mockResolvedValueOnce({ id: "app-1", stage: "APPLIED" });
      const result = await service.applyForVacancy("vac-1", {
        applicantName: "John Doe", email: "john@example.com", phone: "9876543210",
      });
      expect(result.stage).toBe("APPLIED");
    });

    it("should throw NotFoundError when vacancy is not OPEN", async () => {
      mockPrisma.jobVacancy.findUnique.mockResolvedValueOnce({ id: "vac-1", status: "CLOSED" });
      await expect(service.applyForVacancy("vac-1", {
        applicantName: "Jane", email: "j@example.com", phone: "1234567890",
      })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("updateStage", () => {
    it("should update application stage", async () => {
      mockPrisma.jobApplication.update.mockResolvedValueOnce({ id: "app-1", stage: "SHORTLISTED" });
      const result = await service.updateStage("app-1", "SHORTLISTED", "Good profile");
      expect(result.stage).toBe("SHORTLISTED");
      const updateCall = mockPrisma.jobApplication.update.mock.calls[0][0];
      expect(updateCall.data.stageUpdatedAt).toBeInstanceOf(Date);
    });
  });

  describe("getVacancies", () => {
    it("should filter by status when provided", async () => {
      mockPrisma.jobVacancy.findMany.mockResolvedValueOnce([]);
      await service.getVacancies("sch-1", "OPEN");
      expect(mockPrisma.jobVacancy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "OPEN" }) })
      );
    });
  });
});
