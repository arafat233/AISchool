import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

export type AppraisalStage = "SELF_ASSESSMENT" | "HOD_REVIEW" | "PRINCIPAL_SIGNOFF" | "FINALISED";

@Injectable()
export class AppraisalService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create appraisal cycle ───────────────────────────────────────────────────

  async createAppraisal(data: {
    staffId: string; academicYearId: string;
    kras: Array<{ title: string; weightage: number; description?: string }>;
  }) {
    return this.prisma.staffAppraisal.create({
      data: {
        staffId: data.staffId,
        academicYearId: data.academicYearId,
        kras: data.kras,
        stage: "SELF_ASSESSMENT",
      },
    });
  }

  async getAppraisal(id: string) {
    const a = await this.prisma.staffAppraisal.findUnique({ where: { id } });
    if (!a) throw new NotFoundError("Appraisal not found");
    return a;
  }

  async listAppraisals(staffId?: string, academicYearId?: string) {
    return this.prisma.staffAppraisal.findMany({
      where: {
        ...(staffId ? { staffId } : {}),
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: { staff: { include: { user: { include: { profile: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // ─── Self assessment ──────────────────────────────────────────────────────────

  async submitSelfAssessment(appraisalId: string, selfScores: Array<{ kraTitle: string; score: number; remarks?: string }>) {
    return this.prisma.staffAppraisal.update({
      where: { id: appraisalId },
      data: { selfAssessment: selfScores, selfSubmittedAt: new Date(), stage: "HOD_REVIEW" },
    });
  }

  // ─── HOD review ───────────────────────────────────────────────────────────────

  async submitHodReview(appraisalId: string, hodId: string, hodScores: Array<{ kraTitle: string; score: number; remarks?: string }>, hodComments?: string) {
    return this.prisma.staffAppraisal.update({
      where: { id: appraisalId },
      data: { hodReview: hodScores, hodId, hodComments, hodReviewedAt: new Date(), stage: "PRINCIPAL_SIGNOFF" },
    });
  }

  // ─── Principal sign-off ───────────────────────────────────────────────────────

  async principalSignOff(appraisalId: string, principalId: string, finalScore: number, incrementEligible: boolean, comments?: string) {
    return this.prisma.staffAppraisal.update({
      where: { id: appraisalId },
      data: {
        principalId, principalComments: comments, finalScore, incrementEligible,
        signedOffAt: new Date(), stage: "FINALISED",
      },
    });
  }
}
