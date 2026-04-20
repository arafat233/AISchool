import { Test, TestingModule } from "@nestjs/testing";
import { FeatureFlagsService } from "./feature-flags.service";

const mockRedis = {
  connect: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  get: jest.fn().mockResolvedValue(null),
  setEx: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
};

jest.mock("redis", () => ({
  createClient: jest.fn(() => mockRedis),
}));

const mockPrisma = {
  $executeRaw: jest.fn().mockResolvedValue(1),
  $queryRaw: jest.fn().mockResolvedValue([]),
};

const mockFlag = {
  key: "BLOCKCHAIN_CERTS", name: "Blockchain Certs", description: "Cert on chain",
  enabled: true, rollout_pct: 100, beta_only: false, ab_variant: null,
  kill_switch_active: false, created_at: new Date(), updated_at: new Date(),
};

describe("FeatureFlagsService", () => {
  let service: FeatureFlagsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeatureFlagsService, { provide: require("../prisma/prisma.service").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<FeatureFlagsService>(FeatureFlagsService);
    // Simulate onModuleInit
    await service.onModuleInit();
  });

  describe("isEnabled", () => {
    it("should return cached value when present in Redis", async () => {
      mockRedis.get.mockResolvedValueOnce("1");
      const result = await service.isEnabled("BLOCKCHAIN_CERTS", "tenant-1");
      expect(result).toBe(true);
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it("should return false when flag is disabled", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ ...mockFlag, enabled: false }]);
      const result = await service.isEnabled("BLOCKCHAIN_CERTS", "tenant-1");
      expect(result).toBe(false);
    });

    it("should return false when kill switch is active", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ ...mockFlag, kill_switch_active: true }])
        .mockResolvedValueOnce([]); // no override
      const result = await service.isEnabled("BLOCKCHAIN_CERTS", "tenant-1");
      expect(result).toBe(false);
    });

    it("should return true for 100% rollout with no kill switch", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([mockFlag])
        .mockResolvedValueOnce([]); // no tenant override
      const result = await service.isEnabled("BLOCKCHAIN_CERTS", "tenant-1");
      expect(result).toBe(true);
    });
  });

  describe("handleErrorSpike", () => {
    it("should activate kill switch when error rate exceeds 5%", async () => {
      await service.handleErrorSpike("BLOCKCHAIN_CERTS", 7.5);
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it("should NOT activate kill switch when error rate is below threshold", async () => {
      await service.handleErrorSpike("BLOCKCHAIN_CERTS", 3.0);
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe("isBetaSchool", () => {
    it("should return true when tenant is in beta_schools", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ 1: 1 }]);
      expect(await service.isBetaSchool("tenant-1")).toBe(true);
    });

    it("should return false when tenant is not in beta_schools", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      expect(await service.isBetaSchool("tenant-1")).toBe(false);
    });
  });
});
