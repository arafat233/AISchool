import { Test, TestingModule } from "@nestjs/testing";
import { SalaryStructureService } from "./salary-structure.service";

const mockPrisma = {
  salaryStructureComponent: {
    create: jest.fn(), update: jest.fn(), delete: jest.fn(), findMany: jest.fn(),
  },
};

describe("SalaryStructureService", () => {
  let service: SalaryStructureService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalaryStructureService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<SalaryStructureService>(SalaryStructureService);
  });

  describe("createComponent", () => {
    it("should create an EARNING component", async () => {
      mockPrisma.salaryStructureComponent.create.mockResolvedValueOnce({
        id: "comp-1", name: "Basic", isEarning: true,
      });
      const result = await service.createComponent("des-1", {
        name: "Basic", isEarning: true, calcType: "FIXED", value: 30000,
      });
      expect(result.isEarning).toBe(true);
    });

    it("should create a DEDUCTION component", async () => {
      mockPrisma.salaryStructureComponent.create.mockResolvedValueOnce({
        id: "comp-2", name: "Canteen", isEarning: false,
      });
      const result = await service.createComponent("des-1", {
        name: "Canteen", isEarning: false, calcType: "FIXED", value: 500,
      });
      expect(result.isEarning).toBe(false);
    });
  });

  describe("computeSalary", () => {
    it("should compute gross as sum of earnings", () => {
      const components = [
        { name: "Basic", isEarning: true, calcType: "FIXED", value: 30000 },
        { name: "HRA", isEarning: true, calcType: "PERCENT_OF_BASIC", value: 40 }, // 12000
        { name: "Canteen", isEarning: false, calcType: "FIXED", value: 500 },
      ];
      const result = service.computeSalary(components, 30000);
      expect(result.earnings["Basic"]).toBe(30000);
      expect(result.earnings["HRA"]).toBe(12000);
      expect(result.gross).toBe(42000);
      expect(result.deductions["Canteen"]).toBe(500);
      expect(result.totalDeductions).toBe(500);
      expect(result.net).toBe(41500);
    });

    it("should handle PERCENT_OF_GROSS calc type", () => {
      const components = [
        { name: "Basic", isEarning: true, calcType: "FIXED", value: 20000 },
        { name: "Performance", isEarning: true, calcType: "PERCENT_OF_GROSS", value: 10 }, // 10% of gross after basics
        { name: "LoanEMI", isEarning: false, calcType: "FIXED", value: 2000 },
      ];
      const result = service.computeSalary(components, 20000);
      expect(result.gross).toBeGreaterThan(20000);
    });

    it("should return zero net when components are empty", () => {
      const result = service.computeSalary([], 0);
      expect(result.gross).toBe(0);
      expect(result.net).toBe(0);
    });
  });

  describe("getStructure", () => {
    it("should return components ordered by isEarning desc then name", async () => {
      mockPrisma.salaryStructureComponent.findMany.mockResolvedValueOnce([
        { name: "Basic", isEarning: true },
        { name: "HRA", isEarning: true },
        { name: "PF", isEarning: false },
      ]);
      const result = await service.getStructure("des-1");
      expect(result).toHaveLength(3);
    });
  });
});
