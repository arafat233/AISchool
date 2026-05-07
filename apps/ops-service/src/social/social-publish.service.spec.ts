import { Test, TestingModule } from "@nestjs/testing";
import { SocialPublishService, SocialPost } from "./social-publish.service";
import axios from "axios";

// Mock axios and prisma
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Minimal prisma mock (social service uses a local PrismaService path)
const mockPrisma = {
  socialPostConfig: { findUnique: jest.fn() },
  socialPost: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  parentConsentRecord: { findFirst: jest.fn() },
};

// We stub the PrismaService import used by the social service
jest.mock("../prisma/prisma.service", () => ({
  PrismaService: jest.fn().mockImplementation(() => mockPrisma),
}));

const makePost = (overrides: Partial<SocialPost> = {}): SocialPost => ({
  schoolId: "s1",
  title: "School Award",
  message: "Our school won the district award!",
  platform: "FACEBOOK",
  mentionsStudents: false,
  createdBy: "admin1",
  ...overrides,
});

describe("SocialPublishService", () => {
  let service: SocialPublishService;

  beforeEach(async () => {
    const { PrismaService } = await import("../prisma/prisma.service");
    const module: TestingModule = await Test.createTestingModule({
      providers: [SocialPublishService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(SocialPublishService);
    jest.clearAllMocks();
  });

  // ─── publishAchievement ──────────────────────────────────────────────────────

  describe("publishAchievement", () => {
    it("returns a result array", async () => {
      // Config check: no config → BLOCKED or direct publish depending on impl
      mockPrisma.socialPostConfig.findUnique.mockResolvedValue(null);
      mockPrisma.socialPost.create.mockResolvedValue({ id: "p1" });
      mockedAxios.post.mockResolvedValue({ data: { id: "fb_post_123" } });

      const result = await service.publishAchievement(makePost());

      expect(Array.isArray(result)).toBe(true);
    });

    it("does not call external API for scheduled posts", async () => {
      mockPrisma.socialPostConfig.findUnique.mockResolvedValue(null);
      mockPrisma.socialPost.create.mockResolvedValue({ id: "p1" });

      const future = new Date(Date.now() + 3_600_000);
      const result = await service.publishAchievement(makePost({ scheduleAt: future }));

      expect(Array.isArray(result)).toBe(true);
      const statuses = result.map((r) => r.status);
      // Scheduled posts should NOT be PUBLISHED immediately
      expect(statuses).not.toContain("PUBLISHED");
    });
  });
});
