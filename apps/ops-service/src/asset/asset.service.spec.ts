import { Test, TestingModule } from "@nestjs/testing";
import { AssetService } from "./asset.service";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  fixedAsset: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  },
  assetAllocation: {
    create: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
  },
  assetMaintenanceLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  propertyInsurance: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  insuranceClaim: { create: jest.fn(), update: jest.fn() },
  assetVerification: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
};

describe("AssetService", () => {
  let service: AssetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssetService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(AssetService);
    jest.clearAllMocks();
  });

  // ─── registerAsset ───────────────────────────────────────────────────────────

  describe("registerAsset", () => {
    it("sets currentValueRs to cost on creation", async () => {
      const asset = { id: "a1", costRs: 50000, currentValueRs: 50000 };
      mockPrisma.fixedAsset.create.mockResolvedValue(asset);

      await service.registerAsset("s1", {
        name: "Projector", category: "IT", purchaseDate: new Date("2023-01-01"),
        costRs: 50000, usefulLifeYears: 5, depreciationMethod: "SLM", depreciationRate: 20,
      });

      expect(mockPrisma.fixedAsset.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ currentValueRs: 50000 }) }),
      );
    });
  });

  // ─── runDepreciation ─────────────────────────────────────────────────────────

  describe("runDepreciation", () => {
    it("applies SLM depreciation and calls $transaction", async () => {
      const purchaseDate = new Date(Date.now() - 365 * 2 * 86_400_000); // 2 years ago
      mockPrisma.fixedAsset.findMany.mockResolvedValue([{
        id: "a1", costRs: 100000, depreciationMethod: "SLM", depreciationRate: 10, purchaseDate,
      }]);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.fixedAsset.update.mockResolvedValue({});

      const result = await service.runDepreciation("s1");

      // 10% × 2 years = 20% depreciation → ~80000
      expect(result.updated).toBe(1);
      const updatedValue = result.assets[0].currentValueRs;
      expect(updatedValue).toBeGreaterThan(75000);
      expect(updatedValue).toBeLessThan(85000);
    });

    it("applies WDV depreciation correctly", async () => {
      const purchaseDate = new Date(Date.now() - 365 * 1 * 86_400_000); // 1 year ago
      mockPrisma.fixedAsset.findMany.mockResolvedValue([{
        id: "a1", costRs: 100000, depreciationMethod: "WDV", depreciationRate: 20, purchaseDate,
      }]);
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await service.runDepreciation("s1");

      // WDV 20% over 1 year: 100000 × 0.8^1 = 80000
      const updatedValue = result.assets[0].currentValueRs;
      expect(updatedValue).toBeGreaterThan(77000);
      expect(updatedValue).toBeLessThan(83000);
    });
  });

  // ─── allocateAsset ───────────────────────────────────────────────────────────

  describe("allocateAsset", () => {
    it("returns existing active allocation before creating a new one", async () => {
      mockPrisma.assetAllocation.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.assetAllocation.create.mockResolvedValue({ id: "al1" });

      await service.allocateAsset("a1", { department: "Science" });

      expect(mockPrisma.assetAllocation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { assetId: "a1", returnedAt: null } }),
      );
      expect(mockPrisma.assetAllocation.create).toHaveBeenCalled();
    });
  });

  // ─── getAssetsDueService ─────────────────────────────────────────────────────

  describe("getAssetsDueService", () => {
    it("returns assets whose next service date has passed", async () => {
      const pastDate = new Date(Date.now() - 86_400_000); // yesterday
      mockPrisma.fixedAsset.findMany.mockResolvedValue([{ id: "a1", name: "AC", category: "AC" }]);
      mockPrisma.assetMaintenanceLog.findFirst.mockResolvedValue({ nextServiceDue: pastDate });

      const result = await service.getAssetsDueService("s1");

      expect(result).toHaveLength(1);
      expect(result[0].assetId).toBe("a1");
    });

    it("excludes assets whose service date is in the future", async () => {
      const futureDate = new Date(Date.now() + 86_400_000 * 30);
      mockPrisma.fixedAsset.findMany.mockResolvedValue([{ id: "a1", name: "AC", category: "AC" }]);
      mockPrisma.assetMaintenanceLog.findFirst.mockResolvedValue({ nextServiceDue: futureDate });

      const result = await service.getAssetsDueService("s1");

      expect(result).toHaveLength(0);
    });
  });

  // ─── completeVerification ────────────────────────────────────────────────────

  describe("completeVerification", () => {
    it("throws NotFoundError when verification does not exist", async () => {
      mockPrisma.assetVerification.findUnique.mockResolvedValue(null);
      await expect(service.completeVerification("v1", [])).rejects.toThrow(NotFoundError);
    });

    it("records discrepancy when physical count is not 1", async () => {
      mockPrisma.assetVerification.findUnique.mockResolvedValue({ id: "v1" });
      mockPrisma.fixedAsset.findUnique.mockResolvedValue({ name: "Projector" });
      mockPrisma.assetVerification.update.mockResolvedValue({});

      await service.completeVerification("v1", [
        { assetId: "a1", physicalCount: 0 }, // discrepancy
        { assetId: "a2", physicalCount: 1 }, // OK
      ]);

      expect(mockPrisma.assetVerification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            discrepancies: expect.arrayContaining([
              expect.objectContaining({ assetId: "a1", diff: -1 }),
            ]),
          }),
        }),
      );
    });
  });
});
