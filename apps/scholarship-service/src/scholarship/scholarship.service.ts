import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";

@Injectable()
export class ScholarshipService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // [1/8] Scholarship scheme CRUD — merit, need-based, sports, government, donor
  // ═══════════════════════════════════════════════════════════════════════════

  async createScheme(schoolId: string, data: {
    name: string; type: string; description?: string;
    eligibilityCriteria?: object; discountType?: string; discountValue: number;
    feeHeadIds?: string[]; maxBeneficiaries?: number;
    donorRef?: string; govtSchemeCode?: string;
  }) {
    return this.prisma.scholarshipScheme.create({
      data: {
        schoolId, name: data.name, type: data.type, description: data.description,
        eligibilityCriteria: data.eligibilityCriteria ?? {},
        discountType: (data.discountType as any) ?? "PERCENTAGE",
        discountValue: data.discountValue,
        feeHeadIds: data.feeHeadIds ?? [],
        maxBeneficiaries: data.maxBeneficiaries,
        donorRef: data.donorRef,
        govtSchemeCode: data.govtSchemeCode,
      },
    });
  }

  async updateScheme(schemeId: string, data: Partial<{
    name: string; description: string; discountValue: number; maxBeneficiaries: number;
    eligibilityCriteria: object; isActive: boolean;
  }>) {
    return this.prisma.scholarshipScheme.update({ where: { id: schemeId }, data });
  }

  async getSchemes(schoolId: string, type?: string, activeOnly = true) {
    return this.prisma.scholarshipScheme.findMany({
      where: { schoolId, ...(type ? { type } : {}), ...(activeOnly ? { isActive: true } : {}) },
      include: { _count: { select: { applications: true } } },
      orderBy: { name: "asc" },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [2/8] Student application + document submission via portal
  // ═══════════════════════════════════════════════════════════════════════════

  async applyForScholarship(schemeId: string, studentId: string, academicYearId: string, documents: Array<{ type: string; url: string }>) {
    const scheme = await this.prisma.scholarshipScheme.findUnique({ where: { id: schemeId } });
    if (!scheme) throw new NotFoundError("Scholarship scheme not found");
    if (!scheme.isActive) throw new ConflictError("Scholarship scheme is not active");

    // Check seat availability
    if (scheme.maxBeneficiaries) {
      const approved = await this.prisma.scholarshipApplication.count({
        where: { schemeId, status: "APPROVED", academicYearId },
      });
      if (approved >= scheme.maxBeneficiaries) throw new ConflictError("All scholarship seats for this scheme are filled");
    }

    // Auto-run eligibility check
    const { isEligible, score } = await this._checkEligibility(schemeId, studentId, scheme.eligibilityCriteria as Record<string, unknown>);

    return this.prisma.scholarshipApplication.upsert({
      where: { schemeId_studentId_academicYearId: { schemeId, studentId, academicYearId } },
      create: {
        schemeId, studentId, academicYearId,
        documents, eligibilityScore: score, isEligible,
        status: isEligible ? "PENDING" : "REJECTED",
        remarks: isEligible ? undefined : "Auto-rejected: eligibility criteria not met",
      },
      update: { documents, eligibilityScore: score, isEligible, status: isEligible ? "PENDING" : "REJECTED" },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [3/8] Eligibility auto-check — filters ineligible before review
  // ═══════════════════════════════════════════════════════════════════════════

  private async _checkEligibility(schemeId: string, studentId: string, criteria: Record<string, unknown>): Promise<{ isEligible: boolean; score: number }> {
    let score = 100;
    const reasons: string[] = [];

    // Min attendance % check
    if (criteria.minAttendancePct) {
      const sessions = await this.prisma.attendanceRecord.count({ where: { studentId } });
      const present = await this.prisma.attendanceRecord.count({ where: { studentId, status: "PRESENT" } });
      const pct = sessions > 0 ? (present / sessions) * 100 : 0;
      if (pct < Number(criteria.minAttendancePct)) {
        score -= 30;
        reasons.push(`Attendance ${pct.toFixed(1)}% < required ${criteria.minAttendancePct}%`);
      }
    }

    // Min result % check
    if (criteria.minResultPct) {
      const results = await this.prisma.result.findMany({ where: { studentId }, select: { percentage: true } });
      const avg = results.length > 0 ? results.reduce((s, r) => s + Number(r.percentage ?? 0), 0) / results.length : 0;
      if (avg < Number(criteria.minResultPct)) {
        score -= 40;
        reasons.push(`Average marks ${avg.toFixed(1)}% < required ${criteria.minResultPct}%`);
      }
    }

    // Max annual income check (need-based)
    if (criteria.maxAnnualIncomeRs) {
      const profile = await this.prisma.student.findUnique({ where: { id: studentId }, select: { annualFamilyIncomeRs: true } });
      if (profile?.annualFamilyIncomeRs && Number(profile.annualFamilyIncomeRs) > Number(criteria.maxAnnualIncomeRs)) {
        score -= 50;
        reasons.push("Family income exceeds need-based threshold");
      }
    }

    return { isEligible: score >= 50, score };
  }

  async checkEligibility(schemeId: string, studentId: string) {
    const scheme = await this.prisma.scholarshipScheme.findUnique({ where: { id: schemeId } });
    if (!scheme) throw new NotFoundError("Scheme not found");
    return this._checkEligibility(schemeId, studentId, scheme.eligibilityCriteria as Record<string, unknown>);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [4/8] Review committee workflow — rubric scoring, final approval
  // ═══════════════════════════════════════════════════════════════════════════

  async assignReviewer(applicationId: string, reviewerId: string) {
    const app = await this.prisma.scholarshipApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundError("Application not found");
    if (!["PENDING", "UNDER_REVIEW"].includes(app.status)) throw new ConflictError("Application not in reviewable state");

    await this.prisma.scholarshipApplication.update({ where: { id: applicationId }, data: { status: "UNDER_REVIEW" } });

    return this.prisma.scholarshipReview.upsert({
      where: { applicationId_reviewerId: { applicationId, reviewerId } },
      create: { applicationId, reviewerId },
      update: {},
    });
  }

  async submitReview(applicationId: string, reviewerId: string, rubricScores: Record<string, number>, recommendation: "APPROVE" | "REJECT" | "WAITLIST", notes?: string) {
    const totalScore = Object.values(rubricScores).reduce((s, v) => s + v, 0);

    return this.prisma.scholarshipReview.update({
      where: { applicationId_reviewerId: { applicationId, reviewerId } },
      data: { rubricScores, totalScore, recommendation, notes },
    });
  }

  async finalApprove(applicationId: string, approvedBy: string, action: "APPROVED" | "REJECTED" | "WAITLISTED") {
    const app = await this.prisma.scholarshipApplication.findUnique({
      where: { id: applicationId },
      include: { scheme: true },
    });
    if (!app) throw new NotFoundError("Application not found");

    return this.prisma.scholarshipApplication.update({
      where: { id: applicationId },
      data: { status: action, finalApprovedBy: approvedBy, finalApprovedAt: new Date() },
    });
  }

  async getApplications(schemeId: string, status?: string) {
    return this.prisma.scholarshipApplication.findMany({
      where: { schemeId, ...(status ? { status } : {}) },
      include: { student: { select: { rollNumber: true } }, reviews: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getStudentApplications(studentId: string) {
    return this.prisma.scholarshipApplication.findMany({
      where: { studentId },
      include: { scheme: { select: { name: true, type: true, discountValue: true, discountType: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [5/8] Auto-apply scholarship discount to student fee invoice on approval
  // ═══════════════════════════════════════════════════════════════════════════

  async applyScholarshipToFeeInvoice(applicationId: string) {
    const app = await this.prisma.scholarshipApplication.findUnique({
      where: { id: applicationId },
      include: { scheme: true, student: true },
    });
    if (!app) throw new NotFoundError("Application not found");
    if (app.status !== "APPROVED") throw new ConflictError("Scholarship must be APPROVED before applying to invoice");
    if (app.feeInvoiceApplied) throw new ConflictError("Scholarship already applied to fee invoice");

    // Find latest pending fee invoice for this student
    const invoice = await this.prisma.feeInvoice.findFirst({
      where: { studentId: app.studentId, status: { in: ["PENDING", "PARTIAL"] } },
      orderBy: { dueDate: "asc" },
    });
    if (!invoice) throw new NotFoundError("No pending fee invoice found for student");

    // Create a concession on the invoice
    const discountAmt = app.scheme.discountType === "PERCENTAGE"
      ? (Number(invoice.totalAmount) * Number(app.scheme.discountValue)) / 100
      : Number(app.scheme.discountValue);

    const newTotal = Math.max(0, Number(invoice.totalAmount) - discountAmt);

    await this.prisma.$transaction([
      this.prisma.concession.create({
        data: {
          studentId: app.studentId,
          invoiceId: invoice.id,
          type: app.scheme.discountType as any,
          value: app.scheme.discountValue,
          amountRs: discountAmt,
          reason: `Scholarship: ${app.scheme.name}`,
          approvedBy: app.finalApprovedBy ?? "system",
        },
      }),
      this.prisma.feeInvoice.update({
        where: { id: invoice.id },
        data: { totalAmount: newTotal },
      }),
      this.prisma.scholarshipApplication.update({
        where: { id: applicationId },
        data: { feeInvoiceApplied: true },
      }),
    ]);

    return { applicationId, invoiceId: invoice.id, discountAmt, newTotal };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [6/8] Government scholarship tracking — PM e-VIDYA, state schemes, disbursement
  // ═══════════════════════════════════════════════════════════════════════════

  async trackGovernmentScholarship(applicationId: string, data: {
    govtPortalRefNo: string; govtDisbursementRs?: number; govtDisbursedAt?: Date;
  }) {
    return this.prisma.scholarshipApplication.update({
      where: { id: applicationId },
      data: {
        govtPortalRefNo: data.govtPortalRefNo,
        govtDisbursementRs: data.govtDisbursementRs,
        govtDisbursedAt: data.govtDisbursedAt,
      },
    });
  }

  async getGovtScholarshipStatus(schoolId: string, academicYearId: string) {
    // Get all govt-type schemes and their applications
    const schemes = await this.prisma.scholarshipScheme.findMany({
      where: { schoolId, type: "GOVERNMENT" },
    });
    const schemeIds = schemes.map((s) => s.id);

    const applications = await this.prisma.scholarshipApplication.findMany({
      where: { schemeId: { in: schemeIds }, academicYearId },
      include: { scheme: { select: { name: true, govtSchemeCode: true } } },
    });

    return {
      totalApplications: applications.length,
      disbursed: applications.filter((a) => a.govtDisbursedAt).length,
      pending: applications.filter((a) => !a.govtDisbursedAt && a.status === "APPROVED").length,
      totalDisbursedRs: applications.reduce((s, a) => s + Number(a.govtDisbursementRs ?? 0), 0),
      applications,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [7/8] Donor-funded scholarship — link to Corporate Partnership, fund utilisation
  // ═══════════════════════════════════════════════════════════════════════════

  async getDonorFundUtilisation(schoolId: string, donorRef: string, academicYear?: string) {
    const schemes = await this.prisma.scholarshipScheme.findMany({
      where: { schoolId, type: "DONOR", donorRef },
    });
    const schemeIds = schemes.map((s) => s.id);

    const applications = await this.prisma.scholarshipApplication.findMany({
      where: {
        schemeId: { in: schemeIds },
        status: "APPROVED",
        ...(academicYear ? { academicYearId: academicYear } : {}),
      },
      include: { scheme: { select: { name: true, discountValue: true, discountType: true } } },
    });

    const totalBeneficiaries = applications.length;
    const totalFundUtilisedRs = applications.reduce((s, a) => {
      const amt = a.scheme.discountType === "PERCENTAGE"
        ? 0 // can't calc without invoice amount here
        : Number(a.scheme.discountValue);
      return s + amt;
    }, 0);

    return {
      donorRef, totalSchemes: schemes.length, totalBeneficiaries,
      totalFundUtilisedRs,
      schemes: schemes.map((s) => ({ ...s, approvedCount: applications.filter((a) => a.schemeId === s.id).length })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [8/8] Scholarship analytics — who received, amount, fund source, utilisation
  // ═══════════════════════════════════════════════════════════════════════════

  async getScholarshipAnalytics(schoolId: string, academicYearId: string) {
    const schemes = await this.prisma.scholarshipScheme.findMany({ where: { schoolId } });
    const schemeIds = schemes.map((s) => s.id);

    const applications = await this.prisma.scholarshipApplication.findMany({
      where: { schemeId: { in: schemeIds }, academicYearId },
      include: { scheme: { select: { name: true, type: true, discountValue: true, discountType: true, maxBeneficiaries: true } } },
    });

    const byType: Record<string, { count: number; approved: number }> = {};
    const byScheme: Record<string, { name: string; applied: number; approved: number; rejected: number }> = {};

    for (const app of applications) {
      const t = app.scheme.type;
      if (!byType[t]) byType[t] = { count: 0, approved: 0 };
      byType[t].count++;
      if (app.status === "APPROVED") byType[t].approved++;

      const sn = app.scheme.name;
      if (!byScheme[sn]) byScheme[sn] = { name: sn, applied: 0, approved: 0, rejected: 0 };
      byScheme[sn].applied++;
      if (app.status === "APPROVED") byScheme[sn].approved++;
      if (app.status === "REJECTED") byScheme[sn].rejected++;
    }

    return {
      academicYearId,
      totalApplications: applications.length,
      totalApproved: applications.filter((a) => a.status === "APPROVED").length,
      totalRejected: applications.filter((a) => a.status === "REJECTED").length,
      invoiceApplied: applications.filter((a) => a.feeInvoiceApplied).length,
      govtDisbursed: applications.filter((a) => a.govtDisbursedAt).length,
      byType,
      byScheme: Object.values(byScheme),
    };
  }
}
