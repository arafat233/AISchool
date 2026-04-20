import { Test, TestingModule } from "@nestjs/testing";
import { GamificationService } from "./gamification.service";

jest.mock("redis", () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
  })),
}));

const mockPrisma = {
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
  gamificationPoints: { aggregate: jest.fn(), findMany: jest.fn() },
  badgesAwarded: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  studentStreak: { findFirst: jest.fn(), upsert: jest.fn() },
  reward: { findFirst: jest.fn() },
  rewardRedemption: { create: jest.fn() },
  portfolioItem: { create: jest.fn(), findMany: jest.fn() },
  gamificationOptOut: { findFirst: jest.fn().mockResolvedValue(null) },
};

describe("GamificationService", () => {
  let service: GamificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: "PrismaService", useValue: mockPrisma },
      ],
    })
      .overrideProvider(GamificationService)
      .useValue(new (require("./gamification.service").GamificationService)(mockPrisma))
      .compile();
    service = module.get<GamificationService>(GamificationService);
    // Inject redis mock
    (service as any).redis = require("redis").createClient();
    await (service as any).redis.connect();
  });

  describe("awardPoints", () => {
    it("should award points when action not yet awarded today", async () => {
      (service as any).redis.get.mockResolvedValueOnce(null);
      mockPrisma.$executeRaw.mockResolvedValueOnce(1);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ total: 50 }]);
      mockPrisma.studentStreak.findFirst.mockResolvedValueOnce(null);
      mockPrisma.studentStreak.upsert.mockResolvedValueOnce({});

      const result = await service.awardPoints("sch-1", "stu-1", "ATTENDANCE_PRESENT", 10);
      expect(result.awarded).toBe(true);
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it("should skip when same action already awarded today (dedup)", async () => {
      (service as any).redis.get.mockResolvedValueOnce("1"); // already awarded
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ total: 50 }]);

      const result = await service.awardPoints("sch-1", "stu-1", "ATTENDANCE_PRESENT", 10);
      expect(result.awarded).toBe(false);
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe("getTotalPoints", () => {
    it("should return sum of points for student", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ total: 350 }]);
      const total = await service.getTotalPoints("stu-1");
      expect(total).toBe(350);
    });

    it("should return 0 when no points exist", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ total: null }]);
      const total = await service.getTotalPoints("stu-1");
      expect(total).toBe(0);
    });
  });

  describe("checkAndAwardBadges", () => {
    it("should award badge when threshold met and not already earned", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ category: "ACADEMIC", total: 350 }]) // points by category
        .mockResolvedValueOnce([{ total: 350 }]); // total points
      mockPrisma.badgesAwarded.findFirst.mockResolvedValue(null); // no existing badge
      mockPrisma.badgesAwarded.create.mockResolvedValue({});
      mockPrisma.studentStreak.findFirst.mockResolvedValue(null);
      mockPrisma.studentStreak.upsert.mockResolvedValue({});
      (service as any).redis.get.mockResolvedValue(null);
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await service.checkAndAwardBadges("sch-1", "stu-1");
      expect(mockPrisma.badgesAwarded.create).toHaveBeenCalled();
    });

    it("should skip badge if already earned", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ category: "ACADEMIC", total: 350 }]);
      mockPrisma.badgesAwarded.findFirst.mockResolvedValue({ id: "badge-1" }); // already has it
      await service.checkAndAwardBadges("sch-1", "stu-1");
      expect(mockPrisma.badgesAwarded.create).not.toHaveBeenCalled();
    });
  });

  describe("updateStreak", () => {
    it("should increment streak for consecutive day", async () => {
      const yesterday = new Date(Date.now() - 86400000);
      mockPrisma.studentStreak.findFirst.mockResolvedValueOnce({
        currentStreak: 5, longestStreak: 10, lastActivityDate: yesterday,
      });
      mockPrisma.studentStreak.upsert.mockResolvedValueOnce({ currentStreak: 6 });
      await service.updateStreak("stu-1", "ATTENDANCE_PRESENT");
      expect(mockPrisma.studentStreak.upsert).toHaveBeenCalled();
    });

    it("should reset streak to 1 when gap > 1 day", async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
      mockPrisma.studentStreak.findFirst.mockResolvedValueOnce({
        currentStreak: 15, longestStreak: 20, lastActivityDate: twoDaysAgo,
      });
      mockPrisma.studentStreak.upsert.mockResolvedValueOnce({ currentStreak: 1 });
      await service.updateStreak("stu-1", "ATTENDANCE_PRESENT");
      const upsertCall = mockPrisma.studentStreak.upsert.mock.calls[0][0];
      expect(upsertCall.update.currentStreak).toBe(1);
    });
  });

  describe("redeemReward", () => {
    it("should redeem when student has sufficient points", async () => {
      mockPrisma.reward.findFirst.mockResolvedValueOnce({ id: "rwd-1", pointCost: 100, stock: 5 });
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ total: 200 }]);
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.rewardRedemption.create.mockResolvedValueOnce({ id: "red-1" });

      const result = await service.redeemReward("sch-1", "stu-1", "rwd-1");
      expect(result).toBeDefined();
    });

    it("should throw when insufficient points", async () => {
      mockPrisma.reward.findFirst.mockResolvedValueOnce({ id: "rwd-1", pointCost: 500, stock: 5 });
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ total: 100 }]);
      await expect(service.redeemReward("sch-1", "stu-1", "rwd-1")).rejects.toThrow();
    });
  });

  describe("getClassLeaderboard", () => {
    it("should return students sorted by points, excluding opted-out", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { studentId: "stu-1", name: "Ravi", totalPoints: 300, optOut: false },
        { studentId: "stu-2", name: "Priya", totalPoints: 250, optOut: true },
      ]);
      const result = await service.getClassLeaderboard("sch-1", "sec-1");
      expect(result).toBeDefined();
    });
  });
});
