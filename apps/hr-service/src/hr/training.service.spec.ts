import { Test, TestingModule } from "@nestjs/testing";
import { TrainingService } from "./training.service";
import { NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  cpdTraining: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  trainingAttendance: { upsert: jest.fn(), findMany: jest.fn() },
};

describe("TrainingService", () => {
  let service: TrainingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrainingService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<TrainingService>(TrainingService);
  });

  describe("createTraining", () => {
    it("should create training with SCHEDULED status", async () => {
      mockPrisma.cpdTraining.create.mockResolvedValueOnce({ id: "tr-1", status: "SCHEDULED" });
      const result = await service.createTraining("sch-1", {
        title: "NLP Workshop", startDate: new Date(), endDate: new Date(), mode: "IN_PERSON",
      });
      expect(result.status).toBe("SCHEDULED");
    });
  });

  describe("markAttendance", () => {
    it("should upsert attendance and award CPD hours when attended", async () => {
      mockPrisma.cpdTraining.findUnique.mockResolvedValueOnce({ id: "tr-1", cpdHours: 6 });
      mockPrisma.trainingAttendance.upsert.mockResolvedValueOnce({ attended: true, cpdHoursEarned: 6 });
      const result = await service.markAttendance("tr-1", "staff-1", true);
      expect(result.cpdHoursEarned).toBe(6);
    });

    it("should award 0 CPD hours when not attended", async () => {
      mockPrisma.cpdTraining.findUnique.mockResolvedValueOnce({ id: "tr-1", cpdHours: 6 });
      mockPrisma.trainingAttendance.upsert.mockResolvedValueOnce({ attended: false, cpdHoursEarned: 0 });
      const result = await service.markAttendance("tr-1", "staff-1", false);
      const upsertCall = mockPrisma.trainingAttendance.upsert.mock.calls[0][0];
      expect(upsertCall.update.cpdHoursEarned).toBe(0);
    });

    it("should throw NotFoundError when training not found", async () => {
      mockPrisma.cpdTraining.findUnique.mockResolvedValueOnce(null);
      await expect(service.markAttendance("nonexistent", "staff-1", true)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("getTrainings", () => {
    it("should filter by status when provided", async () => {
      mockPrisma.cpdTraining.findMany.mockResolvedValueOnce([]);
      await service.getTrainings("sch-1", { status: "COMPLETED" });
      expect(mockPrisma.cpdTraining.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "COMPLETED" }) })
      );
    });
  });
});
