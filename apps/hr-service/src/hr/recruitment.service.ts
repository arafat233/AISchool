import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

export type ApplicationStage = "APPLIED" | "SHORTLISTED" | "INTERVIEW_SCHEDULED" | "OFFERED" | "HIRED" | "REJECTED";

@Injectable()
export class RecruitmentService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Job vacancies ────────────────────────────────────────────────────────────

  async createVacancy(schoolId: string, data: {
    title: string; designationId: string; departmentId?: string;
    description?: string; requiredCount: number; closingDate?: Date;
    minQualification?: string; minExperience?: number;
  }) {
    return this.prisma.jobVacancy.create({ data: { schoolId, ...data, status: "OPEN" } });
  }

  async updateVacancy(id: string, data: Partial<{ title: string; description: string; closingDate: Date; status: string; requiredCount: number }>) {
    return this.prisma.jobVacancy.update({ where: { id }, data });
  }

  async getVacancies(schoolId: string, status?: string) {
    return this.prisma.jobVacancy.findMany({
      where: { schoolId, ...(status ? { status } : {}) },
      include: { designation: true, department: true, _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // ─── Applications ─────────────────────────────────────────────────────────────

  async applyForVacancy(vacancyId: string, data: {
    applicantName: string; email: string; phone: string;
    resumeUrl?: string; coverLetter?: string; referredBy?: string;
  }) {
    const vacancy = await this.prisma.jobVacancy.findUnique({ where: { id: vacancyId } });
    if (!vacancy || vacancy.status !== "OPEN") throw new NotFoundError("Vacancy not open");
    return this.prisma.jobApplication.create({
      data: { vacancyId, ...data, stage: "APPLIED" },
    });
  }

  async updateStage(applicationId: string, stage: ApplicationStage, notes?: string) {
    return this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { stage, stageNotes: notes, stageUpdatedAt: new Date() },
    });
  }

  async getApplications(vacancyId: string, stage?: ApplicationStage) {
    return this.prisma.jobApplication.findMany({
      where: { vacancyId, ...(stage ? { stage } : {}) },
      orderBy: { appliedAt: "asc" },
    });
  }

  // ─── Interview scheduling ─────────────────────────────────────────────────────

  async scheduleInterview(applicationId: string, data: {
    scheduledAt: Date; interviewers: string[]; mode: "IN_PERSON" | "ONLINE"; location?: string; meetingLink?: string;
  }) {
    return this.prisma.interviewSchedule.create({
      data: {
        applicationId,
        scheduledAt: data.scheduledAt,
        interviewers: data.interviewers,
        mode: data.mode,
        location: data.location,
        meetingLink: data.meetingLink,
        status: "SCHEDULED",
      },
    });
  }

  async submitInterviewFeedback(interviewId: string, data: {
    interviewerId: string; rating: number; strengths?: string; weaknesses?: string;
    recommendation: "HIRE" | "HOLD" | "REJECT";
  }) {
    return this.prisma.interviewFeedback.create({
      data: { interviewId, ...data, submittedAt: new Date() },
    });
  }

  // ─── Offer letter ─────────────────────────────────────────────────────────────

  async generateOffer(applicationId: string, data: {
    ctc: number; joiningDate: Date; offerExpiry: Date; remarks?: string;
  }) {
    const app = await this.prisma.jobApplication.findUnique({ where: { id: applicationId }, include: { vacancy: true } });
    if (!app) throw new NotFoundError("Application not found");

    await this.prisma.jobApplication.update({ where: { id: applicationId }, data: { stage: "OFFERED" } });

    return this.prisma.offerLetter.create({
      data: { applicationId, ctc: data.ctc, joiningDate: data.joiningDate, offerExpiry: data.offerExpiry, remarks: data.remarks, status: "ISSUED" },
    });
  }
}
