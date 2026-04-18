import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ScholarshipService } from "./scholarship.service";

@UseGuards(AuthGuard("jwt"))
@Controller("scholarships")
export class ScholarshipController {
  constructor(private readonly svc: ScholarshipService) {}

  // ─── [1] Scheme CRUD ─────────────────────────────────────────────────────

  @Post(":schoolId/schemes")
  createScheme(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.createScheme(schoolId, body);
  }

  @Patch("schemes/:schemeId")
  updateScheme(@Param("schemeId") schemeId: string, @Body() body: any) {
    return this.svc.updateScheme(schemeId, body);
  }

  @Get(":schoolId/schemes")
  getSchemes(@Param("schoolId") schoolId: string, @Query("type") type?: string, @Query("all") all?: string) {
    return this.svc.getSchemes(schoolId, type, all !== "true");
  }

  // ─── [2] Student application ──────────────────────────────────────────────

  @Post("schemes/:schemeId/apply")
  applyForScholarship(
    @Param("schemeId") schemeId: string,
    @Body() body: { studentId: string; academicYearId: string; documents: Array<{ type: string; url: string }> },
  ) {
    return this.svc.applyForScholarship(schemeId, body.studentId, body.academicYearId, body.documents);
  }

  // ─── [3] Eligibility check ────────────────────────────────────────────────

  @Get("schemes/:schemeId/eligibility/:studentId")
  checkEligibility(@Param("schemeId") schemeId: string, @Param("studentId") studentId: string) {
    return this.svc.checkEligibility(schemeId, studentId);
  }

  // ─── [4] Review committee workflow ───────────────────────────────────────

  @Post("applications/:applicationId/assign-reviewer")
  assignReviewer(@Param("applicationId") applicationId: string, @Body() body: { reviewerId: string }) {
    return this.svc.assignReviewer(applicationId, body.reviewerId);
  }

  @Post("applications/:applicationId/review")
  submitReview(
    @Param("applicationId") applicationId: string,
    @Body() body: { reviewerId: string; rubricScores: Record<string, number>; recommendation: "APPROVE" | "REJECT" | "WAITLIST"; notes?: string },
  ) {
    return this.svc.submitReview(applicationId, body.reviewerId, body.rubricScores, body.recommendation, body.notes);
  }

  @Patch("applications/:applicationId/final-decision")
  finalApprove(
    @Param("applicationId") applicationId: string,
    @Body() body: { approvedBy: string; action: "APPROVED" | "REJECTED" | "WAITLISTED" },
  ) {
    return this.svc.finalApprove(applicationId, body.approvedBy, body.action);
  }

  @Get("schemes/:schemeId/applications")
  getApplications(@Param("schemeId") schemeId: string, @Query("status") status?: string) {
    return this.svc.getApplications(schemeId, status);
  }

  @Get("students/:studentId/applications")
  getStudentApplications(@Param("studentId") studentId: string) {
    return this.svc.getStudentApplications(studentId);
  }

  // ─── [5] Auto-apply to fee invoice ───────────────────────────────────────

  @Post("applications/:applicationId/apply-to-invoice")
  applyToFeeInvoice(@Param("applicationId") applicationId: string) {
    return this.svc.applyScholarshipToFeeInvoice(applicationId);
  }

  // ─── [6] Government scholarship tracking ─────────────────────────────────

  @Patch("applications/:applicationId/govt-tracking")
  trackGovt(
    @Param("applicationId") applicationId: string,
    @Body() body: { govtPortalRefNo: string; govtDisbursementRs?: number; govtDisbursedAt?: string },
  ) {
    return this.svc.trackGovernmentScholarship(applicationId, { ...body, govtDisbursedAt: body.govtDisbursedAt ? new Date(body.govtDisbursedAt) : undefined });
  }

  @Get(":schoolId/govt-status")
  getGovtStatus(@Param("schoolId") schoolId: string, @Query("academicYearId") academicYearId: string) {
    return this.svc.getGovtScholarshipStatus(schoolId, academicYearId);
  }

  // ─── [7] Donor fund utilisation ───────────────────────────────────────────

  @Get(":schoolId/donor-utilisation")
  getDonorUtilisation(@Param("schoolId") schoolId: string, @Query("donorRef") donorRef: string, @Query("academicYear") academicYear?: string) {
    return this.svc.getDonorFundUtilisation(schoolId, donorRef, academicYear);
  }

  // ─── [8] Analytics ───────────────────────────────────────────────────────

  @Get(":schoolId/analytics")
  getAnalytics(@Param("schoolId") schoolId: string, @Query("academicYearId") academicYearId: string) {
    return this.svc.getScholarshipAnalytics(schoolId, academicYearId);
  }
}
