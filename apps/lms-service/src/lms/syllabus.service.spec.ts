import { Test, TestingModule } from "@nestjs/testing";
import { SyllabusService } from "./syllabus.service";
import { NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  syllabicTopic: { findUnique: jest.fn(), findMany: jest.fn() },
  syllabusProgress: { upsert: jest.fn() },
};

describe("SyllabusService", () => {
  let service: SyllabusService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [SyllabusService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<SyllabusService>(SyllabusService);
  });

  describe("markTopicStatus", () => {
    it("should upsert progress for topic", async () => {
      mockPrisma.syllabicTopic.findUnique.mockResolvedValueOnce({ id: "topic-1" });
      mockPrisma.syllabusProgress.upsert.mockResolvedValueOnce({ status: "COMPLETED" });
      const result = await service.markTopicStatus({
        syllabicTopicId: "topic-1", staffId: "staff-1", status: "COMPLETED",
      });
      expect(result.status).toBe("COMPLETED");
    });

    it("should throw NotFoundError when topic not found", async () => {
      mockPrisma.syllabicTopic.findUnique.mockResolvedValueOnce(null);
      await expect(service.markTopicStatus({
        syllabicTopicId: "nonexistent", staffId: "staff-1", status: "IN_PROGRESS",
      })).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should set completedDate automatically when status is COMPLETED", async () => {
      mockPrisma.syllabicTopic.findUnique.mockResolvedValueOnce({ id: "topic-1" });
      mockPrisma.syllabusProgress.upsert.mockResolvedValueOnce({ status: "COMPLETED" });
      await service.markTopicStatus({ syllabicTopicId: "topic-1", staffId: "staff-1", status: "COMPLETED" });
      const upsertCall = mockPrisma.syllabusProgress.upsert.mock.calls[0][0];
      expect(upsertCall.create.completedDate).toBeInstanceOf(Date);
    });
  });

  describe("getCoverageReport", () => {
    it("should return coverage percentage", async () => {
      mockPrisma.syllabicTopic.findMany.mockResolvedValueOnce([
        { id: "t-1", syllabusProgress: [{ status: "COMPLETED" }] },
        { id: "t-2", syllabusProgress: [{ status: "IN_PROGRESS" }] },
        { id: "t-3", syllabusProgress: [] },
        { id: "t-4", syllabusProgress: [{ status: "COMPLETED" }] },
      ]);
      const result = await service.getCoverageReport("sub-1", "class-1");
      expect(result.total).toBe(4);
      expect(result.completed).toBe(2);
      expect(result.completionPercentage).toBe(50);
    });
  });
});
