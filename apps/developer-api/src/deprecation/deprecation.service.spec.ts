import { Test, TestingModule } from "@nestjs/testing";
import { DeprecationService, DeprecationNotice } from "./deprecation.service";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPrisma = {
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
};

jest.mock("../prisma/prisma.service", () => ({
  PrismaService: jest.fn().mockImplementation(() => mockPrisma),
}));

const makeNotice = (overrides: Partial<DeprecationNotice> = {}): DeprecationNotice => {
  const sunsetDate = new Date();
  sunsetDate.setMonth(sunsetDate.getMonth() + 8); // 8 months = valid
  return {
    endpointPattern: "GET /v1/students/:id/marks",
    reason: "Replaced by results endpoint",
    replacedBy: "GET /v2/students/:id/results",
    sunsetDate,
    ...overrides,
  };
};

describe("DeprecationService", () => {
  let service: DeprecationService;

  beforeEach(async () => {
    const { PrismaService } = await import("../prisma/prisma.service");
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeprecationService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(DeprecationService);
    jest.clearAllMocks();
    mockPrisma.$executeRaw.mockResolvedValue(undefined);
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockedAxios.post.mockResolvedValue({ data: {} });
  });

  // ─── registerDeprecation ─────────────────────────────────────────────────────

  describe("registerDeprecation", () => {
    it("inserts deprecation notice when sunset is >= 6 months away", async () => {
      await service.registerDeprecation(makeNotice());
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("throws when sunset date is less than 6 months from today", async () => {
      const tooSoon = new Date();
      tooSoon.setMonth(tooSoon.getMonth() + 3);
      await expect(service.registerDeprecation(makeNotice({ sunsetDate: tooSoon }))).rejects.toThrow(
        /6 months/i,
      );
    });

    it("notifies affected developers after inserting notice", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { id: "k1", school_id: "s1", contact_email: "dev@example.com" },
      ]);

      await service.registerDeprecation(makeNotice());

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/internal/alert"),
        expect.objectContaining({ type: "API_DEPRECATION_NOTICE" }),
      );
    });

    it("continues gracefully when notification call fails", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ id: "k1", school_id: "s1", contact_email: "dev@example.com" }]);
      mockedAxios.post.mockRejectedValue(new Error("Network error"));

      await expect(service.registerDeprecation(makeNotice())).resolves.not.toThrow();
    });
  });

  // ─── getDeprecationHeaders ───────────────────────────────────────────────────

  describe("getDeprecationHeaders", () => {
    it("returns empty object when no notices match", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      const headers = await service.getDeprecationHeaders("GET", "/v1/students/abc/marks");
      expect(headers).toEqual({});
    });

    it("returns Deprecation + Sunset headers for matching endpoint", async () => {
      const sunsetDate = new Date("2027-01-01");
      mockPrisma.$queryRaw.mockResolvedValue([{
        endpoint_pattern: "GET /v1/students/:id/marks",
        sunset_date: sunsetDate,
        replaced_by: "GET /v2/students/:id/results",
      }]);

      const headers = await service.getDeprecationHeaders("GET", "/v1/students/123/marks");

      expect(headers["Deprecation"]).toBe("true");
      expect(headers["Sunset"]).toBeDefined();
      expect(headers["Link"]).toContain("/v2/students/:id/results");
    });

    it("does not match different HTTP method", async () => {
      const sunsetDate = new Date("2027-01-01");
      mockPrisma.$queryRaw.mockResolvedValue([{
        endpoint_pattern: "GET /v1/students/:id/marks",
        sunset_date: sunsetDate,
        replaced_by: null,
      }]);

      const headers = await service.getDeprecationHeaders("POST", "/v1/students/123/marks");
      expect(headers).toEqual({});
    });
  });
});
