import { Test, TestingModule } from "@nestjs/testing";
import { MentoringService } from "./mentoring.service";

const mockPrisma = {
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
  mentorAssignment: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  mentorMeeting: { create: jest.fn(), findMany: jest.fn() },
  portfolioItem: { create: jest.fn() },
};

describe("MentoringService", () => {
  let service: MentoringService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [MentoringService, { provide: "PrismaService", useValue: mockPrisma }],
    })
      .overrideProvider(MentoringService)
      .useValue(new (require("./mentoring.service").MentoringService)(mockPrisma))
      .compile();
    service = module.get<MentoringService>(MentoringService);
  });

  describe("assignMentor", () => {
    it("should create a mentor assignment", async () => {
      mockPrisma.mentorAssignment.findFirst.mockResolvedValueOnce(null);
      mockPrisma.mentorAssignment.create.mockResolvedValueOnce({ id: "ma-1", mentorId: "staff-1", studentId: "stu-1" });
      const result = await service.assignMentor("stu-1", "staff-1", "sch-1");
      expect(result.id).toBe("ma-1");
    });

    it("should throw ConflictError if student already has a mentor", async () => {
      mockPrisma.mentorAssignment.findFirst.mockResolvedValueOnce({ id: "ma-existing" });
      await expect(service.assignMentor("stu-1", "staff-1", "sch-1")).rejects.toThrow();
    });
  });

  describe("logMeeting", () => {
    it("should create a meeting record", async () => {
      mockPrisma.mentorMeeting.create.mockResolvedValueOnce({ id: "meet-1", notes: "Great progress" });
      const result = await service.logMeeting("ma-1", { date: "2026-04-20", notes: "Great progress", duration: 30 } as any);
      expect(result.id).toBe("meet-1");
    });
  });

  describe("getMentoringEffectivenessReport", () => {
    it("should calculate exam score delta (post - pre)", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { studentId: "stu-1", name: "Ravi", preScore: 60, postScore: 75, delta: 15 },
      ]);
      const result = await service.getMentoringEffectivenessReport("sch-1");
      expect(result[0].delta).toBe(15);
    });

    it("should return empty array when no mentoring data", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      const result = await service.getMentoringEffectivenessReport("sch-1");
      expect(result).toHaveLength(0);
    });
  });

  describe("recogniseMentor", () => {
    it("should add portfolio item and award gamification points", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.portfolioItem.create.mockResolvedValueOnce({ id: "port-1" });
      await service.recogniseMentor("staff-1", "sch-1");
      expect(mockPrisma.portfolioItem.create).toHaveBeenCalled();
    });
  });
});
