import { Test, TestingModule } from "@nestjs/testing";
import { GratuityService } from "./gratuity.service";
import { NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  staff: { findUnique: jest.fn() },
  gratuityProvision: { upsert: jest.fn() },
};

const mockStaff = (yearsAgo: number) => ({
  id: "staff-1",
  joinDate: new Date(Date.now() - yearsAgo * 365.25 * 86400000),
  designation: {
    salaryComponents: [
      { name: "Basic", value: 50000, isEarning: true, calcType: "FIXED" },
      { name: "DA", value: 5000, isEarning: true, calcType: "FIXED" },
    ],
  },
});

describe("GratuityService", () => {
  let service: GratuityService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [GratuityService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<GratuityService>(GratuityService);
  });

  describe("calculateGratuity", () => {
    it("should return eligible=true and correct amount after 10 years", async () => {
      mockPrisma.staff.findUnique.mockResolvedValueOnce(mockStaff(10));
      const result = await service.calculateGratuity("staff-1");
      expect(result.eligible).toBe(true);
      // (50000 + 5000) × 10 × 15/26 ≈ 317307.69
      expect(result.gratuityAmount).toBeCloseTo(55000 * 10 * 15 / 26, 0);
    });

    it("should return eligible=false and amount=0 after 4 years", async () => {
      mockPrisma.staff.findUnique.mockResolvedValueOnce(mockStaff(4));
      const result = await service.calculateGratuity("staff-1");
      expect(result.eligible).toBe(false);
      expect(result.gratuityAmount).toBe(0);
      expect(result.message).toContain("Minimum 5 years");
    });

    it("should be eligible at exactly 5 years", async () => {
      mockPrisma.staff.findUnique.mockResolvedValueOnce(mockStaff(5));
      const result = await service.calculateGratuity("staff-1");
      expect(result.eligible).toBe(true);
      expect(result.gratuityAmount).toBeGreaterThan(0);
    });

    it("should throw NotFoundError when staff not found", async () => {
      mockPrisma.staff.findUnique.mockResolvedValueOnce(null);
      await expect(service.calculateGratuity("nonexistent")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("accrueMonthlyProvision", () => {
    it("should upsert provision record", async () => {
      mockPrisma.staff.findUnique.mockResolvedValueOnce(mockStaff(8));
      mockPrisma.gratuityProvision.upsert.mockResolvedValueOnce({ id: "prov-1" });
      await service.accrueMonthlyProvision("staff-1", 4, 2026);
      expect(mockPrisma.gratuityProvision.upsert).toHaveBeenCalled();
    });
  });
});
