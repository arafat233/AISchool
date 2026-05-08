import { Test, TestingModule } from "@nestjs/testing";
import { ReportController } from "./report.controller";
import { ReportService } from "./report.service";

const mockReportService = {
  getAttendanceSummary: jest.fn(),
  getDefaulterList: jest.fn(),
  getFeeCollectionReport: jest.fn(),
  getFeeDefaulterReport: jest.fn(),
  getFeeReceipt: jest.fn(),
  getClassResultReport: jest.fn(),
  getReportCard: jest.fn(),
  getStaffAttendanceSummary: jest.fn(),
  getPayslip: jest.fn(),
  getBudgetVsActual: jest.fn(),
  getScholarshipReport: jest.fn(),
  getAdmissionFunnel: jest.fn(),
  getOpsDashboard: jest.fn(),
  buildCustomReport: jest.fn(),
};

// Helper: create a mock Express Response object
function makeRes() {
  const res: any = {};
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
}

describe("ReportController", () => {
  let controller: ReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [{ provide: ReportService, useValue: mockReportService }],
    })
      .overrideGuard(require("@nestjs/passport").AuthGuard("jwt"))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReportController>(ReportController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ─── Attendance ────────────────────────────────────────────────────────────

  describe("attendanceSummary", () => {
    it("calls service and returns json data", async () => {
      const data = { present: 90, absent: 10 };
      mockReportService.getAttendanceSummary.mockResolvedValue(data);
      const res = makeRes();
      await controller.attendanceSummary("school1", "2025-01-01", "2025-01-31", "json", res);
      expect(mockReportService.getAttendanceSummary).toHaveBeenCalledWith(
        "school1",
        expect.any(Date),
        expect.any(Date),
        "json",
      );
      expect(res.json).toHaveBeenCalledWith(data);
    });

    it("propagates service errors", async () => {
      mockReportService.getAttendanceSummary.mockRejectedValue(new Error("Report error"));
      const res = makeRes();
      await expect(
        controller.attendanceSummary("school1", "2025-01-01", "2025-01-31", "json", res),
      ).rejects.toThrow("Report error");
    });
  });

  describe("defaulters", () => {
    it("returns defaulter list with parsed threshold", async () => {
      const list = [{ studentId: "s1", percentage: 60 }];
      mockReportService.getDefaulterList.mockResolvedValue(list);
      const result = await controller.defaulters("school1", "75");
      expect(result).toEqual(list);
      expect(mockReportService.getDefaulterList).toHaveBeenCalledWith("school1", 75);
    });

    it("uses default threshold of 75 when not provided", async () => {
      mockReportService.getDefaulterList.mockResolvedValue([]);
      await controller.defaulters("school1", "");
      expect(mockReportService.getDefaulterList).toHaveBeenCalledWith("school1", 75);
    });
  });

  // ─── Fee ──────────────────────────────────────────────────────────────────

  describe("feeCollection", () => {
    it("returns json report data", async () => {
      const data = { totalCollected: 500000 };
      mockReportService.getFeeCollectionReport.mockResolvedValue(data);
      const res = makeRes();
      await controller.feeCollection("school1", "2025-01-01", "2025-01-31", "json", res);
      expect(res.json).toHaveBeenCalledWith(data);
    });
  });

  describe("feeDefaulters", () => {
    it("returns fee defaulter report", async () => {
      const report = [{ studentId: "s1" }];
      mockReportService.getFeeDefaulterReport.mockResolvedValue(report);
      const result = await controller.feeDefaulters("school1");
      expect(result).toEqual(report);
      expect(mockReportService.getFeeDefaulterReport).toHaveBeenCalledWith("school1");
    });
  });

  describe("feeReceipt", () => {
    it("sets PDF headers and sends buffer", async () => {
      const pdfBuffer = Buffer.from("PDF content");
      mockReportService.getFeeReceipt.mockResolvedValue(pdfBuffer);
      const res = makeRes();
      await controller.feeReceipt("pay1", res);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ "Content-Type": "application/pdf" }),
      );
      expect(res.send).toHaveBeenCalledWith(pdfBuffer);
    });
  });

  // ─── Academic ─────────────────────────────────────────────────────────────

  describe("classResults", () => {
    it("returns json results data", async () => {
      const data = { pass: 28, fail: 2 };
      mockReportService.getClassResultReport.mockResolvedValue(data);
      const res = makeRes();
      await controller.classResults("cls1", "exam1", "json", res);
      expect(res.json).toHaveBeenCalledWith(data);
      expect(mockReportService.getClassResultReport).toHaveBeenCalledWith("cls1", "exam1", "json");
    });
  });

  describe("reportCard", () => {
    it("sends PDF report card", async () => {
      const pdf = Buffer.from("report card PDF");
      mockReportService.getReportCard.mockResolvedValue(pdf);
      const res = makeRes();
      await controller.reportCard("s1", "exam1", res);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ "Content-Type": "application/pdf" }),
      );
      expect(res.send).toHaveBeenCalledWith(pdf);
    });
  });

  // ─── HR ───────────────────────────────────────────────────────────────────

  describe("staffAttendance", () => {
    it("calls service with parsed month and year", async () => {
      const data = { totalStaff: 50 };
      mockReportService.getStaffAttendanceSummary.mockResolvedValue(data);
      const res = makeRes();
      await controller.staffAttendance("school1", "1", "2025", "json", res);
      expect(mockReportService.getStaffAttendanceSummary).toHaveBeenCalledWith("school1", 1, 2025, "json");
      expect(res.json).toHaveBeenCalledWith(data);
    });
  });

  describe("payslip", () => {
    it("sends PDF payslip", async () => {
      const pdf = Buffer.from("payslip PDF");
      mockReportService.getPayslip.mockResolvedValue(pdf);
      const res = makeRes();
      await controller.payslip("staff1", "1", "2025", res);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ "Content-Type": "application/pdf" }),
      );
      expect(res.send).toHaveBeenCalledWith(pdf);
    });
  });

  // ─── Finance ──────────────────────────────────────────────────────────────

  describe("budgetVsActual", () => {
    it("calls service and returns data", async () => {
      const data = { surplus: 10000 };
      mockReportService.getBudgetVsActual.mockResolvedValue(data);
      const res = makeRes();
      await controller.budgetVsActual("school1", "2025-26", "json", res);
      expect(mockReportService.getBudgetVsActual).toHaveBeenCalledWith("school1", "2025-26", "json");
    });
  });

  // ─── Admissions ───────────────────────────────────────────────────────────

  describe("admissionFunnel", () => {
    it("returns funnel data", async () => {
      const funnel = { applied: 200, enrolled: 80 };
      mockReportService.getAdmissionFunnel.mockResolvedValue(funnel);
      const result = await controller.admissionFunnel("school1", "2025-26");
      expect(result).toEqual(funnel);
      expect(mockReportService.getAdmissionFunnel).toHaveBeenCalledWith("school1", "2025-26");
    });
  });

  // ─── Ops Dashboard ────────────────────────────────────────────────────────

  describe("opsDashboard", () => {
    it("returns ops dashboard for schoolId", async () => {
      const dash = { revenue: 1000000 };
      mockReportService.getOpsDashboard.mockResolvedValue(dash);
      const result = await controller.opsDashboard("school1");
      expect(result).toEqual(dash);
      expect(mockReportService.getOpsDashboard).toHaveBeenCalledWith("school1");
    });
  });

  // ─── Custom Report ────────────────────────────────────────────────────────

  describe("customReport", () => {
    it("delegates to buildCustomReport and returns json", async () => {
      const data = { rows: [] };
      mockReportService.buildCustomReport.mockResolvedValue(data);
      const res = makeRes();
      const dto = { entity: "STUDENT", format: "json" } as any;
      await controller.customReport(dto, res);
      expect(mockReportService.buildCustomReport).toHaveBeenCalledWith(dto);
      expect(res.json).toHaveBeenCalledWith(data);
    });
  });

  // ─── Health ────────────────────────────────────────────────────────────────

  describe("health", () => {
    it("returns ok status", () => {
      expect(controller.health()).toEqual({ status: "ok", service: "report-service" });
    });
  });
});
