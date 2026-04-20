import { Test, TestingModule } from "@nestjs/testing";
import { ApiKeyService } from "./apikey.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

const mockPrisma = {
  tenant: { findUnique: jest.fn() },
  apiKey: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
};

describe("ApiKeyService", () => {
  let service: ApiKeyService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiKeyService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<ApiKeyService>(ApiKeyService);
  });

  describe("issueKey", () => {
    it("should return raw key starting with sk_live_", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: "t-1", plan: "STANDARD" });
      mockPrisma.apiKey.create.mockResolvedValueOnce({ id: "key-1" });
      const result = await service.issueKey("t-1", "Production Key");
      expect(result.raw).toMatch(/^sk_live_/);
      expect(result.prefix).toBe(result.raw.slice(0, 12));
      expect(result.rateLimit).toBe(100); // STANDARD plan
    });

    it("should apply correct rate limit per plan", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: "t-1", plan: "ENTERPRISE" });
      mockPrisma.apiKey.create.mockResolvedValueOnce({ id: "key-2" });
      const result = await service.issueKey("t-1", "Enterprise Key");
      expect(result.rateLimit).toBe(1000);
    });

    it("should throw NotFoundException when tenant not found", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);
      await expect(service.issueKey("nonexistent", "Key")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("revokeKey", () => {
    it("should set isActive=false and revokedAt", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValueOnce({ id: "key-1", tenantId: "t-1" });
      mockPrisma.apiKey.update.mockResolvedValueOnce({ id: "key-1", isActive: false });
      const result = await service.revokeKey("key-1", "t-1");
      expect(result.isActive).toBe(false);
    });

    it("should throw ForbiddenException when key belongs to different tenant", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValueOnce({ id: "key-1", tenantId: "other-tenant" });
      await expect(service.revokeKey("key-1", "t-1")).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("should throw NotFoundException when key not found", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValueOnce(null);
      await expect(service.revokeKey("nonexistent", "t-1")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("recordUsage", () => {
    it("should increment requestCount and update lastUsedAt", async () => {
      mockPrisma.apiKey.update.mockResolvedValueOnce({ id: "key-1", requestCount: 11 });
      await service.recordUsage("key-1");
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ requestCount: { increment: 1 } }) })
      );
    });
  });
});
