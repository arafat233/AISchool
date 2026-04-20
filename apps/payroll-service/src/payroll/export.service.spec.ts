import { Test, TestingModule } from "@nestjs/testing";
import { ExportService } from "./export.service";
import { NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  payrollRun: { findUnique: jest.fn() },
  payslip: { findMany: jest.fn() },
};

const mockPayslip = {
  id: "slip-1",
  grossSalary: 55000,
  lopDays: 0,
  breakdown: { earnings: { Basic: 30000, HRA: 12000, DA: 5000 } },
  staff: {
    pfAccountNo: "100123456789",
    user: { profile: { firstName: "Ravi", lastName: "Kumar" } },
  },
};

describe("ExportService", () => {
  let service: ExportService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExportService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<ExportService>(ExportService);
  });

  describe("generateECR", () => {
    it("should return a Buffer containing ECR header", async () => {
      mockPrisma.payrollRun.findUnique.mockResolvedValueOnce({
        id: "run-1", payslips: [mockPayslip],
      });
      const buffer = await service.generateECR("run-1");
      expect(buffer).toBeInstanceOf(Buffer);
      const content = buffer.toString("utf8");
      expect(content).toContain("UAN");
      expect(content).toContain("Member Name");
    });

    it("should include staff UAN and name in ECR data row", async () => {
      mockPrisma.payrollRun.findUnique.mockResolvedValueOnce({
        id: "run-1", payslips: [mockPayslip],
      });
      const buffer = await service.generateECR("run-1");
      const content = buffer.toString("utf8");
      expect(content).toContain("100123456789");
      expect(content).toContain("Ravi Kumar");
    });

    it("should throw NotFoundError when run not found", async () => {
      mockPrisma.payrollRun.findUnique.mockResolvedValueOnce(null);
      await expect(service.generateECR("nonexistent")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should compute PF correctly in ECR (12% of Basic capped at 15k)", async () => {
      mockPrisma.payrollRun.findUnique.mockResolvedValueOnce({
        id: "run-1", payslips: [mockPayslip], // basic=30000, capped at 15000, pf=1800
      });
      const buffer = await service.generateECR("run-1");
      const content = buffer.toString("utf8");
      expect(content).toContain("1800"); // employee PF contribution
    });
  });
});
