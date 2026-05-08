import { Test, TestingModule } from "@nestjs/testing";
import { ScholarshipController } from "./scholarship.controller";
import { ScholarshipService } from "./scholarship.service";

const mockScholarshipService = {
  createScheme: jest.fn(),
  updateScheme: jest.fn(),
  getSchemes: jest.fn(),
  applyForScholarship: jest.fn(),
  checkEligibility: jest.fn(),
  assignReviewer: jest.fn(),
  submitReview: jest.fn(),
  finalApprove: jest.fn(),
  getApplications: jest.fn(),
  getStudentApplications: jest.fn(),
  applyScholarshipToFeeInvoice: jest.fn(),
  trackGovernmentScholarship: jest.fn(),
  getGovtScholarshipStatus: jest.fn(),
  getDonorFundUtilisation: jest.fn(),
  getScholarshipAnalytics: jest.fn(),
};

describe("ScholarshipController", () => {
  let controller: ScholarshipController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScholarshipController],
      providers: [{ provide: ScholarshipService, useValue: mockScholarshipService }],
    })
      .overrideGuard(require("@nestjs/passport").AuthGuard("jwt"))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ScholarshipController>(ScholarshipController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ─── Scheme CRUD ──────────────────────────────────────────────────────────

  describe("createScheme", () => {
    it("creates scheme with schoolId from param", async () => {
      const scheme = { id: "sc1", name: "Merit" };
      mockScholarshipService.createScheme.mockResolvedValue(scheme);
      const dto = { name: "Merit", type: "MERIT", fundingSource: "SCHOOL" } as any;
      expect(await controller.createScheme("school1", dto)).toEqual(scheme);
      expect(mockScholarshipService.createScheme).toHaveBeenCalledWith("school1", dto);
    });

    it("propagates service errors", async () => {
      mockScholarshipService.createScheme.mockRejectedValue(new Error("Conflict"));
      await expect(controller.createScheme("school1", {} as any)).rejects.toThrow("Conflict");
    });
  });

  describe("updateScheme", () => {
    it("delegates to service with schemeId", async () => {
      const updated = { id: "sc1", name: "Updated Merit" };
      mockScholarshipService.updateScheme.mockResolvedValue(updated);
      const dto = { name: "Updated Merit" } as any;
      expect(await controller.updateScheme("sc1", dto)).toEqual(updated);
      expect(mockScholarshipService.updateScheme).toHaveBeenCalledWith("sc1", dto);
    });
  });

  describe("getSchemes", () => {
    it("returns active schemes by default (all != true)", async () => {
      const schemes = [{ id: "sc1" }];
      mockScholarshipService.getSchemes.mockResolvedValue(schemes);
      const result = await controller.getSchemes("school1", "MERIT");
      expect(result).toEqual(schemes);
      expect(mockScholarshipService.getSchemes).toHaveBeenCalledWith("school1", "MERIT", true);
    });

    it("returns all schemes when all=true query param passed", async () => {
      mockScholarshipService.getSchemes.mockResolvedValue([]);
      await controller.getSchemes("school1", undefined, "true");
      expect(mockScholarshipService.getSchemes).toHaveBeenCalledWith("school1", undefined, false);
    });
  });

  // ─── Student Application ───────────────────────────────────────────────────

  describe("applyForScholarship", () => {
    it("calls service with schemeId, studentId, academicYearId, and documents", async () => {
      const application = { id: "app1" };
      mockScholarshipService.applyForScholarship.mockResolvedValue(application);
      const body = {
        studentId: "s1",
        academicYearId: "ay1",
        documents: [{ type: "INCOME_PROOF", url: "http://example.com/doc.pdf" }],
      };
      expect(await controller.applyForScholarship("sc1", body)).toEqual(application);
      expect(mockScholarshipService.applyForScholarship).toHaveBeenCalledWith(
        "sc1",
        "s1",
        "ay1",
        body.documents,
      );
    });
  });

  // ─── Eligibility ───────────────────────────────────────────────────────────

  describe("checkEligibility", () => {
    it("returns eligibility result", async () => {
      const result = { eligible: true, reasons: [] };
      mockScholarshipService.checkEligibility.mockResolvedValue(result);
      expect(await controller.checkEligibility("sc1", "s1")).toEqual(result);
      expect(mockScholarshipService.checkEligibility).toHaveBeenCalledWith("sc1", "s1");
    });
  });

  // ─── Review Workflow ───────────────────────────────────────────────────────

  describe("assignReviewer", () => {
    it("calls service with applicationId and reviewerId", async () => {
      mockScholarshipService.assignReviewer.mockResolvedValue({ id: "app1" });
      await controller.assignReviewer("app1", { reviewerId: "rev1" });
      expect(mockScholarshipService.assignReviewer).toHaveBeenCalledWith("app1", "rev1");
    });
  });

  describe("submitReview", () => {
    it("calls service with all review fields", async () => {
      mockScholarshipService.submitReview.mockResolvedValue({ id: "rev1" });
      const body = {
        reviewerId: "rev1",
        rubricScores: { academic: 8, financial: 9 },
        recommendation: "APPROVE" as const,
        notes: "Strong candidate",
      };
      await controller.submitReview("app1", body);
      expect(mockScholarshipService.submitReview).toHaveBeenCalledWith(
        "app1",
        "rev1",
        body.rubricScores,
        "APPROVE",
        "Strong candidate",
      );
    });
  });

  describe("finalApprove", () => {
    it("calls service with applicationId, approvedBy, and action", async () => {
      mockScholarshipService.finalApprove.mockResolvedValue({ id: "app1", status: "APPROVED" });
      const body = { approvedBy: "principal1", action: "APPROVED" as const };
      await controller.finalApprove("app1", body);
      expect(mockScholarshipService.finalApprove).toHaveBeenCalledWith("app1", "principal1", "APPROVED");
    });
  });

  describe("getApplications", () => {
    it("returns applications for a scheme", async () => {
      const apps = [{ id: "app1" }, { id: "app2" }];
      mockScholarshipService.getApplications.mockResolvedValue(apps);
      const result = await controller.getApplications("sc1", "PENDING");
      expect(result).toEqual(apps);
      expect(mockScholarshipService.getApplications).toHaveBeenCalledWith("sc1", "PENDING");
    });
  });

  describe("getStudentApplications", () => {
    it("returns all applications for a student", async () => {
      const apps = [{ id: "app1" }];
      mockScholarshipService.getStudentApplications.mockResolvedValue(apps);
      const result = await controller.getStudentApplications("s1");
      expect(result).toEqual(apps);
      expect(mockScholarshipService.getStudentApplications).toHaveBeenCalledWith("s1");
    });
  });

  // ─── Fee Invoice Application ───────────────────────────────────────────────

  describe("applyToFeeInvoice", () => {
    it("delegates to service with applicationId", async () => {
      mockScholarshipService.applyScholarshipToFeeInvoice.mockResolvedValue({ applied: true });
      await controller.applyToFeeInvoice("app1");
      expect(mockScholarshipService.applyScholarshipToFeeInvoice).toHaveBeenCalledWith("app1");
    });
  });

  // ─── Government Tracking ───────────────────────────────────────────────────

  describe("trackGovt", () => {
    it("calls service with parsed govtDisbursedAt date", async () => {
      mockScholarshipService.trackGovernmentScholarship.mockResolvedValue({ id: "app1" });
      const body = { govtPortalRefNo: "GOV123", govtDisbursementRs: 5000, govtDisbursedAt: "2025-03-01" };
      await controller.trackGovt("app1", body);
      expect(mockScholarshipService.trackGovernmentScholarship).toHaveBeenCalledWith(
        "app1",
        expect.objectContaining({ govtPortalRefNo: "GOV123", govtDisbursedAt: expect.any(Date) }),
      );
    });

    it("passes undefined govtDisbursedAt when not provided", async () => {
      mockScholarshipService.trackGovernmentScholarship.mockResolvedValue({ id: "app1" });
      const body = { govtPortalRefNo: "GOV123" };
      await controller.trackGovt("app1", body);
      expect(mockScholarshipService.trackGovernmentScholarship).toHaveBeenCalledWith(
        "app1",
        expect.objectContaining({ govtDisbursedAt: undefined }),
      );
    });
  });

  describe("getGovtStatus", () => {
    it("returns government scholarship status for school", async () => {
      const status = [{ applicationId: "app1", status: "DISBURSED" }];
      mockScholarshipService.getGovtScholarshipStatus.mockResolvedValue(status);
      const result = await controller.getGovtStatus("school1", "ay1");
      expect(result).toEqual(status);
      expect(mockScholarshipService.getGovtScholarshipStatus).toHaveBeenCalledWith("school1", "ay1");
    });
  });

  // ─── Donor Utilisation ────────────────────────────────────────────────────

  describe("getDonorUtilisation", () => {
    it("returns donor utilisation report", async () => {
      const report = { totalGranted: 100000, utilised: 75000 };
      mockScholarshipService.getDonorFundUtilisation.mockResolvedValue(report);
      const result = await controller.getDonorUtilisation("school1", "DONOR-REF-001", "2025-26");
      expect(result).toEqual(report);
      expect(mockScholarshipService.getDonorFundUtilisation).toHaveBeenCalledWith(
        "school1",
        "DONOR-REF-001",
        "2025-26",
      );
    });
  });

  // ─── Analytics ────────────────────────────────────────────────────────────

  describe("getAnalytics", () => {
    it("returns scholarship analytics for school and academic year", async () => {
      const analytics = { totalAwarded: 50, avgAmount: 8000 };
      mockScholarshipService.getScholarshipAnalytics.mockResolvedValue(analytics);
      const result = await controller.getAnalytics("school1", "ay1");
      expect(result).toEqual(analytics);
      expect(mockScholarshipService.getScholarshipAnalytics).toHaveBeenCalledWith("school1", "ay1");
    });
  });

  // ─── Health ────────────────────────────────────────────────────────────────

  describe("health", () => {
    it("returns ok status", () => {
      expect(controller.health()).toEqual({ status: "ok", service: "scholarship-service" });
    });
  });
});
