import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";

@Injectable()
export class AlumniService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── [1] Alumni registration — auto-invite on TC issuance ──────────────
  async registerAlumni(schoolId: string, studentId: string, graduationYear: number) {
    return this.prisma.alumniProfile.upsert({
      where: { studentId },
      create: { schoolId, studentId, graduationYear, registeredAt: new Date() },
      update: { registeredAt: new Date() },
    });
  }

  async inviteAlumni(schoolId: string, studentId: string, graduationYear: number) {
    return this.prisma.alumniProfile.upsert({
      where: { studentId },
      create: { schoolId, studentId, graduationYear, invitedAt: new Date() },
      update: { invitedAt: new Date() },
    });
  }

  async updateAlumniProfile(alumniId: string, data: Partial<{
    city: string; country: string; employer: string; jobTitle: string; industry: string;
    linkedInUrl: string; isDirectoryOptIn: boolean;
  }>) {
    return this.prisma.alumniProfile.update({ where: { id: alumniId }, data });
  }

  // ─── [2] Alumni directory — searchable, opt-in ──────────────────────────
  async searchDirectory(schoolId: string, opts: { batchYear?: number; city?: string; employer?: string; industry?: string }) {
    return this.prisma.alumniProfile.findMany({
      where: {
        schoolId, isDirectoryOptIn: true,
        ...(opts.batchYear ? { graduationYear: opts.batchYear } : {}),
        ...(opts.city ? { city: { contains: opts.city, mode: "insensitive" } } : {}),
        ...(opts.employer ? { employer: { contains: opts.employer, mode: "insensitive" } } : {}),
        ...(opts.industry ? { industry: { contains: opts.industry, mode: "insensitive" } } : {}),
      },
      orderBy: { graduationYear: "desc" },
    });
  }

  // ─── [3] Job board — alumni posts, school moderates, applicants apply ───
  async postJob(schoolId: string, alumniId: string, data: { title: string; company: string; description?: string; location?: string; salaryRange?: string }) {
    return this.prisma.alumniJobPosting.create({ data: { schoolId, alumniId, ...data } });
  }

  async moderateJob(jobId: string, moderatedBy: string, approve: boolean) {
    return this.prisma.alumniJobPosting.update({
      where: { id: jobId },
      data: { status: approve ? "APPROVED" : "CLOSED", moderatedBy },
    });
  }

  async applyForJob(jobId: string, applicantId: string, applicantType: "STUDENT" | "ALUMNI") {
    const job = await this.prisma.alumniJobPosting.findUnique({ where: { id: jobId } });
    if (!job || job.status !== "APPROVED") throw new ConflictError("Job is not open for applications");
    return this.prisma.jobApplication.upsert({
      where: { jobPostingId_applicantId: { jobPostingId: jobId, applicantId } },
      create: { jobPostingId: jobId, applicantId, applicantType },
      update: {},
    });
  }

  async getJobBoard(schoolId: string, status = "APPROVED") {
    return this.prisma.alumniJobPosting.findMany({
      where: { schoolId, status },
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // ─── [4] Placement tracking ─────────────────────────────────────────────
  async recordPlacement(alumniId: string, data: { employer: string; industry?: string; salaryBand?: string; startYear: number }) {
    return this.prisma.placementRecord.create({ data: { alumniId, ...data } });
  }

  async getPlacementAnalytics(schoolId: string) {
    const alumni = await this.prisma.alumniProfile.findMany({ where: { schoolId }, select: { id: true } });
    const ids = alumni.map((a) => a.id);
    const records = await this.prisma.placementRecord.findMany({ where: { alumniId: { in: ids } } });

    const byIndustry: Record<string, number> = {};
    for (const r of records) {
      const k = r.industry ?? "Unknown";
      byIndustry[k] = (byIndustry[k] ?? 0) + 1;
    }

    return { totalPlacements: records.length, byIndustry, records };
  }

  // ─── [5] Mentor-mentee linking ──────────────────────────────────────────
  async requestMentoring(mentorAlumniId: string, menteeStudentId: string) {
    return this.prisma.mentorMenteeLink.upsert({
      where: { mentorAlumniId_menteeStudentId: { mentorAlumniId, menteeStudentId } },
      create: { mentorAlumniId, menteeStudentId },
      update: { status: "REQUESTED" },
    });
  }

  async updateMentorLink(linkId: string, data: { status?: string; sessionsCount?: number; notes?: string }) {
    return this.prisma.mentorMenteeLink.update({ where: { id: linkId }, data });
  }

  async getMentors(schoolId: string) {
    const alumni = await this.prisma.alumniProfile.findMany({ where: { schoolId }, select: { id: true } });
    const ids = alumni.map((a) => a.id);
    return this.prisma.mentorMenteeLink.findMany({
      where: { mentorAlumniId: { in: ids }, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
  }

  // ─── [6] Donations / fundraising ────────────────────────────────────────
  async createCampaign(schoolId: string, data: { title: string; description?: string; targetAmtRs: number; startDate: Date; endDate: Date }) {
    return this.prisma.donationCampaign.create({ data: { schoolId, ...data } });
  }

  async recordDonation(campaignId: string, data: { donorId: string; donorType: string; amountRs: number; paymentRef?: string; notes?: string }) {
    const [donation] = await this.prisma.$transaction([
      this.prisma.donation.create({ data: { campaignId, ...data } }),
      this.prisma.donationCampaign.update({
        where: { id: campaignId },
        data: { raisedAmtRs: { increment: data.amountRs } },
      }),
    ]);
    return donation;
  }

  async getCampaigns(schoolId: string) {
    return this.prisma.donationCampaign.findMany({
      where: { schoolId },
      include: { _count: { select: { donations: true } } },
      orderBy: { startDate: "desc" },
    });
  }

  async getDonorImpactReport(campaignId: string) {
    const campaign = await this.prisma.donationCampaign.findUnique({
      where: { id: campaignId },
      include: { donations: { orderBy: { createdAt: "desc" } } },
    });
    if (!campaign) throw new NotFoundError("Campaign not found");

    const byDonorType: Record<string, { count: number; totalRs: number }> = {};
    for (const d of campaign.donations) {
      if (!byDonorType[d.donorType]) byDonorType[d.donorType] = { count: 0, totalRs: 0 };
      byDonorType[d.donorType].count++;
      byDonorType[d.donorType].totalRs += Number(d.amountRs);
    }

    return {
      campaignId, title: campaign.title, targetAmtRs: Number(campaign.targetAmtRs),
      raisedAmtRs: Number(campaign.raisedAmtRs),
      pctAchieved: Number(campaign.targetAmtRs) > 0 ? Math.round((Number(campaign.raisedAmtRs) / Number(campaign.targetAmtRs)) * 100) : 0,
      totalDonors: campaign.donations.length,
      byDonorType,
    };
  }
}
