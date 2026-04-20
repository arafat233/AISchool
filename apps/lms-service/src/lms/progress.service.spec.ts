import { Test, TestingModule } from "@nestjs/testing";
import { ProgressService } from "./progress.service";

const mockPrisma = {
  lesson: { findUnique: jest.fn() },
  lessonProgress: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  courseEnrollment: { findFirst: jest.fn() },
};

describe("ProgressService", () => {
  let service: ProgressService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProgressService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<ProgressService>(ProgressService);
  });

  describe("updateProgress", () => {
    it("should mark VIDEO lesson as complete when watched >= 80%", async () => {
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({ id: "l-1", type: "VIDEO", durationSeconds: 300 });
      mockPrisma.lessonProgress.findUnique.mockResolvedValueOnce(null);
      mockPrisma.lessonProgress.upsert.mockResolvedValueOnce({ isCompleted: true });

      const result = await service.updateProgress("stu-1", "l-1", { watchedSeconds: 250 }); // 83%
      expect(result?.isCompleted).toBe(true);
    });

    it("should NOT mark VIDEO as complete when watched < 80%", async () => {
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({ id: "l-1", type: "VIDEO", durationSeconds: 300 });
      mockPrisma.lessonProgress.findUnique.mockResolvedValueOnce(null);
      mockPrisma.lessonProgress.upsert.mockResolvedValueOnce({ isCompleted: false });

      const result = await service.updateProgress("stu-1", "l-1", { watchedSeconds: 100 }); // 33%
      const upsertCall = mockPrisma.lessonProgress.upsert.mock.calls[0][0];
      expect(upsertCall.update.isCompleted).toBe(false);
    });

    it("should mark PDF complete when scrolled to 100%", async () => {
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({ id: "l-2", type: "PDF", durationSeconds: 0 });
      mockPrisma.lessonProgress.findUnique.mockResolvedValueOnce(null);
      mockPrisma.lessonProgress.upsert.mockResolvedValueOnce({ isCompleted: true });

      await service.updateProgress("stu-1", "l-2", { scrollPercent: 100 });
      const upsertCall = mockPrisma.lessonProgress.upsert.mock.calls[0][0];
      expect(upsertCall.create.isCompleted).toBe(true);
    });

    it("should auto-complete ARTICLE type on open", async () => {
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({ id: "l-3", type: "ARTICLE", durationSeconds: 0 });
      mockPrisma.lessonProgress.findUnique.mockResolvedValueOnce(null);
      mockPrisma.lessonProgress.upsert.mockResolvedValueOnce({ isCompleted: true });

      await service.updateProgress("stu-1", "l-3", {});
      const upsertCall = mockPrisma.lessonProgress.upsert.mock.calls[0][0];
      expect(upsertCall.create.isCompleted).toBe(true);
    });

    it("should not regress already-completed lesson", async () => {
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({ id: "l-1", type: "VIDEO", durationSeconds: 300 });
      mockPrisma.lessonProgress.findUnique.mockResolvedValueOnce({ isCompleted: true }); // already done
      const result = await service.updateProgress("stu-1", "l-1", { watchedSeconds: 50 });
      expect(mockPrisma.lessonProgress.upsert).not.toHaveBeenCalled();
    });

    it("should return undefined when lesson not found", async () => {
      mockPrisma.lesson.findUnique.mockResolvedValueOnce(null);
      const result = await service.updateProgress("stu-1", "nonexistent", {});
      expect(result).toBeUndefined();
    });
  });
});
