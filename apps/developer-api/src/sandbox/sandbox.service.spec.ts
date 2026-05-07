import { Test, TestingModule } from "@nestjs/testing";
import { SandboxService } from "./sandbox.service";

// Mock node-schedule so no real cron fires
jest.mock("node-schedule", () => ({ scheduleJob: jest.fn() }));

const mockPrisma = {
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
};

jest.mock("../prisma/prisma.service", () => ({
  PrismaService: jest.fn().mockImplementation(() => mockPrisma),
}));

describe("SandboxService", () => {
  let service: SandboxService;

  beforeEach(async () => {
    const { PrismaService } = await import("../prisma/prisma.service");
    const module: TestingModule = await Test.createTestingModule({
      providers: [SandboxService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(SandboxService);
    jest.clearAllMocks();
    mockPrisma.$executeRaw.mockResolvedValue(undefined);
  });

  // ─── provisionSandbox ────────────────────────────────────────────────────────

  describe("provisionSandbox", () => {
    it("returns a test API key in sk_test_ format", async () => {
      const result = await service.provisionSandbox("school-1");
      expect(result.testApiKey).toMatch(/^sk_test_[a-f0-9]{48}$/);
    });

    it("inserts api_key and seeds students", async () => {
      await service.provisionSandbox("school-1");
      // 1 call for api_key insert + 5 for student seeds
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(6);
    });

    it("generates a unique key on each call", async () => {
      const a = await service.provisionSandbox("school-1");
      const b = await service.provisionSandbox("school-2");
      expect(a.testApiKey).not.toBe(b.testApiKey);
    });
  });

  // ─── seedSandboxData ─────────────────────────────────────────────────────────

  describe("seedSandboxData", () => {
    it("inserts exactly 5 sandbox students", async () => {
      await service.seedSandboxData("school-1");
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(5);
    });
  });

  // ─── resetAllSandboxes ───────────────────────────────────────────────────────

  describe("resetAllSandboxes", () => {
    it("deletes and re-seeds each sandbox school", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ school_id: "s1" }, { school_id: "s2" }]);

      await service.resetAllSandboxes();

      // 2 schools × (1 delete + 5 seeds) = 12 execute calls
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(12);
    });

    it("handles empty sandbox list gracefully", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      await expect(service.resetAllSandboxes()).resolves.not.toThrow();
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });
  });
});
