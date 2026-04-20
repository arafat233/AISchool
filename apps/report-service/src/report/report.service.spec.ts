import { Test, TestingModule } from "@nestjs/testing";
import { ReportService } from "./report.service";

// Mock puppeteer-core so tests don't need a real browser
jest.mock("puppeteer-core", () => ({
  launch: jest.fn(() => ({
    newPage: jest.fn(() => ({
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from("<pdf>")),
    })),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}), { virtual: true });

// Mock exceljs
jest.mock("exceljs", () => ({
  Workbook: jest.fn().mockImplementation(() => ({
    addWorksheet: jest.fn(() => ({
      addRow: jest.fn(),
      getRow: jest.fn(() => ({ font: {} })),
    })),
    xlsx: { writeBuffer: jest.fn().mockResolvedValue(Buffer.from("<xlsx>")) },
  })),
}), { virtual: true });

const mockPrisma = {
  attendanceRecord: { findMany: jest.fn() },
  feeInvoice: { findMany: jest.fn() },
  examResult: { findMany: jest.fn() },
  student: { findMany: jest.fn() },
};

describe("ReportService", () => {
  let service: ReportService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<ReportService>(ReportService);
  });

  describe("getAttendanceSummary", () => {
    const from = new Date("2026-04-01");
    const to = new Date("2026-04-30");

    it("should return JSON with aggregated attendance per student", async () => {
      mockPrisma.attendanceRecord.findMany.mockResolvedValueOnce([
        { studentId: "stu-1", status: "PRESENT", student: { fullName: "Alice", rollNo: "101", class: { name: "Grade 5A" } } },
        { studentId: "stu-1", status: "PRESENT", student: { fullName: "Alice", rollNo: "101", class: { name: "Grade 5A" } } },
        { studentId: "stu-1", status: "ABSENT", student: { fullName: "Alice", rollNo: "101", class: { name: "Grade 5A" } } },
      ]);
      const result = await service.getAttendanceSummary("sch-1", from, to, "json") as any[];
      expect(result).toHaveLength(1);
      expect(result[0].present).toBe(2);
      expect(result[0].absent).toBe(1);
      expect(result[0].pct).toBe(67);
    });

    it("should return a Buffer when format is pdf", async () => {
      mockPrisma.attendanceRecord.findMany.mockResolvedValueOnce([]);
      const result = await service.getAttendanceSummary("sch-1", from, to, "pdf");
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it("should return a Buffer when format is excel", async () => {
      mockPrisma.attendanceRecord.findMany.mockResolvedValueOnce([]);
      const result = await service.getAttendanceSummary("sch-1", from, to, "excel");
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });
});
