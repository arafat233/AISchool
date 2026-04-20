import { Test, TestingModule } from "@nestjs/testing";
import { PayrollService } from "./payroll.service";
import { SalaryStructureService } from "./salary-structure.service";
import { ConflictError, NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  payrollRun: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  payslip: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  staff: {
    findMany: jest.fn(),
  },
  staffAttendance: {
    aggregate: jest.fn(),
  },
  salaryAdvance: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

const mockStructureService = {
  computeSalary: jest.fn(),
};

describe("PayrollService", () => {
  let service: PayrollService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: "PrismaService", useValue: mockPrisma },
        { provide: SalaryStructureService, useValue: mockStructureService },
      ],
    })
      .overrideProvider("PrismaService")
      .useValue(mockPrisma)
      .compile();

    service = module.get<PayrollService>(PayrollService);
    // Inject mocks directly since Prisma token may vary
    (service as any).prisma = mockPrisma;
    (service as any).structure = mockStructureService;
  });

  beforeEach(() => jest.clearAllMocks());

  // ── createRun ───────────────────────────────────────────────────────────────

  describe("createRun", () => {
    it("creates a DRAFT payroll run when no existing run", async () => {
      mockPrisma.payrollRun.findUnique.mockResolvedValue(null);
      mockPrisma.payrollRun.create.mockResolvedValue({
        id: "run1",
        schoolId: "school1",
        month: 4,
        year: 2026,
        status: "DRAFT",
        academicYearId: "ay1",
      });

      const result = await service.createRun("school1", { academicYearId: "ay1", month: 4, year: 2026 });

      expect(mockPrisma.payrollRun.findUnique).toHaveBeenCalledWith({
        where: { schoolId_month_year: { schoolId: "school1", month: 4, year: 2026 } },
      });
      expect(mockPrisma.payrollRun.create).toHaveBeenCalledWith({
        data: { schoolId: "school1", academicYearId: "ay1", month: 4, year: 2026, status: "DRAFT" },
      });
      expect(result.status).toBe("DRAFT");
    });

    it("throws ConflictError when run already exists for the month", async () => {
      mockPrisma.payrollRun.findUnique.mockResolvedValue({ id: "existing-run" });

      await expect(
        service.createRun("school1", { academicYearId: "ay1", month: 4, year: 2026 })
      ).rejects.toThrow(ConflictError);
    });
  });

  // ── processRun ──────────────────────────────────────────────────────────────

  describe("processRun", () => {
    it("throws NotFoundError if run does not exist", async () => {
      mockPrisma.payrollRun.findUnique.mockResolvedValue(null);

      await expect(service.processRun("missing-run")).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError if run is not in DRAFT status", async () => {
      mockPrisma.payrollRun.findUnique.mockResolvedValue({
        id: "run1",
        status: "PROCESSED",
        schoolId: "school1",
        month: 4,
        year: 2026,
        payslips: [],
      });

      await expect(service.processRun("run1")).rejects.toThrow(ConflictError);
    });

    it("processes DRAFT run → sets PROCESSING → creates payslips → returns PROCESSED run", async () => {
      const mockRun = {
        id: "run1",
        schoolId: "school1",
        month: 4,
        year: 2026,
        status: "DRAFT",
        payslips: [],
      };

      mockPrisma.payrollRun.findUnique.mockResolvedValue(mockRun);
      mockPrisma.payrollRun.update
        .mockResolvedValueOnce({ ...mockRun, status: "PROCESSING" })
        .mockResolvedValueOnce({ ...mockRun, status: "PROCESSED", payslips: [{ id: "ps1" }] });

      mockPrisma.staff.findMany.mockResolvedValue([
        {
          id: "staff1",
          schoolId: "school1",
          status: "ACTIVE",
          designation: {
            salaryComponents: [
              { name: "Basic", isEarning: true, calcType: "FIXED", value: 20000 },
              { name: "HRA", isEarning: true, calcType: "PERCENT_OF_BASIC", value: 40 },
            ],
          },
        },
      ]);

      mockStructureService.computeSalary.mockReturnValue({
        earnings: { Basic: 20000, HRA: 8000 },
        deductions: {},
        gross: 28000,
        totalDeductions: 0,
        net: 28000,
      });

      mockPrisma.staffAttendance.aggregate.mockResolvedValue({ _count: 0 });
      mockPrisma.salaryAdvance.findMany.mockResolvedValue([]);

      mockPrisma.payslip.upsert.mockResolvedValue({
        id: "ps1",
        staffId: "staff1",
        grossSalary: 28000,
        deductions: 3360,
        netSalary: 24640,
      });

      const result = await service.processRun("run1");

      expect(mockPrisma.payrollRun.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "PROCESSING" } })
      );
      expect(mockPrisma.payslip.upsert).toHaveBeenCalledTimes(1);
      expect(result.status).toBe("PROCESSED");
    });
  });

  // ── approveRun ──────────────────────────────────────────────────────────────

  describe("approveRun", () => {
    it("updates run status to APPROVED with approver id and timestamp", async () => {
      mockPrisma.payrollRun.update.mockResolvedValue({
        id: "run1",
        status: "APPROVED",
        approvedBy: "admin1",
      });

      const result = await service.approveRun("run1", "admin1");

      expect(mockPrisma.payrollRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "run1" },
          data: expect.objectContaining({ status: "APPROVED", approvedBy: "admin1" }),
        })
      );
      expect(result.status).toBe("APPROVED");
      expect(result.approvedBy).toBe("admin1");
    });
  });

  // ── disburseRun ─────────────────────────────────────────────────────────────

  describe("disburseRun", () => {
    it("sets status to DISBURSED", async () => {
      mockPrisma.payrollRun.update.mockResolvedValue({ id: "run1", status: "DISBURSED" });

      const result = await service.disburseRun("run1");

      expect(mockPrisma.payrollRun.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "DISBURSED" }) })
      );
      expect(result.status).toBe("DISBURSED");
    });
  });

  // ── getPayslip ──────────────────────────────────────────────────────────────

  describe("getPayslip", () => {
    it("returns payslip with staff and profile included", async () => {
      const mockPayslip = {
        id: "ps1",
        staffId: "staff1",
        payrollRunId: "run1",
        grossSalary: 28000,
        staff: { id: "staff1", user: { profile: { firstName: "John", lastName: "Doe" } } },
      };
      mockPrisma.payslip.findUnique.mockResolvedValue(mockPayslip);

      const result = await service.getPayslip("run1", "staff1");

      expect(mockPrisma.payslip.findUnique).toHaveBeenCalledWith({
        where: { payrollRunId_staffId: { payrollRunId: "run1", staffId: "staff1" } },
        include: { staff: { include: { user: { include: { profile: true } } } } },
      });
      expect(result?.grossSalary).toBe(28000);
      expect(result?.staff.user.profile.firstName).toBe("John");
    });

    it("returns null when payslip not found", async () => {
      mockPrisma.payslip.findUnique.mockResolvedValue(null);
      const result = await service.getPayslip("run1", "unknown-staff");
      expect(result).toBeNull();
    });
  });

  // ── getRuns ─────────────────────────────────────────────────────────────────

  describe("getRuns", () => {
    it("returns runs for a school ordered by year/month desc", async () => {
      const runs = [
        { id: "run2", year: 2026, month: 4 },
        { id: "run1", year: 2026, month: 3 },
      ];
      mockPrisma.payrollRun.findMany.mockResolvedValue(runs);

      const result = await service.getRuns("school1", 2026);

      expect(mockPrisma.payrollRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { schoolId: "school1", year: 2026 } })
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("run2");
    });
  });
});
