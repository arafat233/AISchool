import { Test, TestingModule } from "@nestjs/testing";
import { GdprService } from "./gdpr.service";

const mockPrisma = {
  $executeRaw: jest.fn(),
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};

jest.mock("../prisma/prisma.service", () => ({
  PrismaService: jest.fn().mockImplementation(() => mockPrisma),
}));

describe("GdprService", () => {
  let service: GdprService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprService,
        { provide: "PrismaService", useValue: mockPrisma },
      ],
    })
      .overrideProvider(GdprService)
      .useValue(new (require("./gdpr.service").GdprService)(mockPrisma))
      .compile();

    service = module.get<GdprService>(GdprService);
  });

  describe("requestErasure", () => {
    it("should insert erasure request and return pending status", async () => {
      mockPrisma.$executeRaw.mockResolvedValueOnce(1);
      const result = await service.requestErasure("user-1", "I want my data removed");
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
      expect(result.status).toBe("PENDING");
      expect(result.scheduledFor).toBeInstanceOf(Date);
      // scheduledFor is ~30 days from now
      const diff = result.scheduledFor.getTime() - Date.now();
      expect(diff).toBeGreaterThan(29 * 86400000);
      expect(diff).toBeLessThan(31 * 86400000);
    });
  });

  describe("executeErasure", () => {
    it("should run a transaction that pseudonymises PII fields", async () => {
      mockPrisma.$transaction.mockResolvedValueOnce([1, 1, 1, 1]);
      await service.executeErasure("user-1");
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([expect.anything()])
      );
    });
  });

  describe("exportUserData", () => {
    it("should run 5 parallel queries and return structured export", async () => {
      const mockUser = [{ id: "user-1", email: "test@test.com" }];
      mockPrisma.$queryRaw
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce([{ full_name: "Test" }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.exportUserData("user-1");
      expect(result.user).toEqual(mockUser);
      expect(result.exportedAt).toBeDefined();
      expect(result.note).toContain("GDPR");
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(5);
    });
  });

  describe("updateConsent", () => {
    it("should upsert each consent category", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);
      await service.updateConsent("user-1", { marketing: true, analytics: false });
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it("should handle empty consents object without error", async () => {
      await service.updateConsent("user-1", {});
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe("getConsents", () => {
    it("should query user consents", async () => {
      const mockConsents = [{ category: "marketing", granted: true }];
      mockPrisma.$queryRaw.mockResolvedValueOnce(mockConsents);
      const result = await service.getConsents("user-1");
      expect(result).toEqual(mockConsents);
    });
  });
});
