import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";

@Injectable()
export class AdmissionService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Enquiry Management ───────────────────────────────────────────────────────

  async createEnquiry(schoolId: string, data: {
    studentName: string; parentName: string; parentPhone: string; parentEmail?: string;
    dateOfBirth?: Date; applyingForGrade?: string;
    source?: string; referredBy?: string; notes?: string; assignedTo?: string;
  }) {
    return this.prisma.enquiry.create({
      data: { schoolId, ...data, source: data.source ?? "WALK_IN", status: "OPEN" },
    });
  }

  async getEnquiries(schoolId: string, status?: string, source?: string) {
    return this.prisma.enquiry.findMany({
      where: { schoolId, ...(status ? { status } : {}), ...(source ? { source } : {}) },
      include: { _count: { select: { followUpLogs: true } }, application: { select: { id: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getEnquiry(id: string) {
    const e = await this.prisma.enquiry.findUnique({
      where: { id },
      include: { followUpLogs: { orderBy: { createdAt: "desc" } }, application: true },
    });
    if (!e) throw new NotFoundError("Enquiry not found");
    return e;
  }

  async updateEnquiry(id: string, data: Partial<{
    status: string; assignedTo: string; notes: string; nextFollowUpDate: Date;
  }>) {
    return this.prisma.enquiry.update({ where: { id }, data });
  }

  // ─── Follow-up Log ────────────────────────────────────────────────────────────

  async addFollowUp(enquiryId: string, data: {
    channel: string; outcome: string; nextAction?: string; nextDate?: Date; loggedBy: string;
  }) {
    const enquiry = await this.prisma.enquiry.findUnique({ where: { id: enquiryId } });
    if (!enquiry) throw new NotFoundError("Enquiry not found");

    const [log] = await this.prisma.$transaction([
      this.prisma.enquiryFollowUp.create({ data: { enquiryId, ...data } }),
      this.prisma.enquiry.update({
        where: { id: enquiryId },
        data: { nextFollowUpDate: data.nextDate, status: "FOLLOW_UP" },
      }),
    ]);
    return log;
  }

  // ─── Admission Application ────────────────────────────────────────────────────

  async createApplication(schoolId: string, data: {
    enquiryId?: string; studentName: string; parentName: string; parentPhone: string;
    parentEmail?: string; dateOfBirth?: Date; applyingForGrade: string;
    isRteQuota?: boolean; rteIncome?: number;
  }) {
    const count = await this.prisma.admissionApplication.count({ where: { schoolId } });
    const applicationNo = `ADM-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    // If linked to enquiry, mark it as CONVERTED
    if (data.enquiryId) {
      await this.prisma.enquiry.update({ where: { id: data.enquiryId }, data: { status: "CONVERTED" } });
    }

    return this.prisma.admissionApplication.create({
      data: { schoolId, applicationNo, ...data, status: "SUBMITTED" },
    });
  }

  async getApplications(schoolId: string, status?: string) {
    return this.prisma.admissionApplication.findMany({
      where: { schoolId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  async getApplication(id: string) {
    const a = await this.prisma.admissionApplication.findUnique({ where: { id } });
    if (!a) throw new NotFoundError("Application not found");
    return a;
  }

  async updateApplicationStatus(id: string, data: {
    status: string; interviewDate?: Date; offerDate?: Date;
    rejectionReason?: string; reviewedBy?: string;
  }) {
    return this.prisma.admissionApplication.update({ where: { id }, data });
  }

  async uploadDocument(id: string, doc: { type: string; url: string }) {
    const app = await this.prisma.admissionApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundError("Application not found");
    const docs = (app.documents as any[]) ?? [];
    docs.push({ ...doc, verified: false, uploadedAt: new Date() });
    return this.prisma.admissionApplication.update({ where: { id }, data: { documents: docs } });
  }

  async verifyDocument(id: string, docType: string) {
    const app = await this.prisma.admissionApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundError("Application not found");
    const docs = ((app.documents as any[]) ?? []).map((d: any) =>
      d.type === docType ? { ...d, verified: true } : d
    );
    return this.prisma.admissionApplication.update({ where: { id }, data: { documents: docs } });
  }

  // ─── OCR Auto-fill (mock — real: AWS Textract) ────────────────────────────────

  async ocrExtract(id: string, documentUrl: string) {
    // Production: call AWS Textract, extract name/DOB/etc.
    // Mocked here to show integration point
    const extracted = {
      studentName: null,
      dateOfBirth: null,
      parentName: null,
      extractedFrom: documentUrl,
      extractedAt: new Date(),
      note: "Integrate AWS Textract in production",
    };
    await this.prisma.admissionApplication.update({ where: { id }, data: { ocrExtracted: extracted } });
    return extracted;
  }

  // ─── RTE Quota ────────────────────────────────────────────────────────────────

  async getRteQuota(schoolId: string, academicYear: string) {
    return this.prisma.rteQuotaAllocation.findUnique({ where: { schoolId_academicYear: { schoolId, academicYear } } });
  }

  async setRteQuota(schoolId: string, academicYear: string, totalSeats: number) {
    return this.prisma.rteQuotaAllocation.upsert({
      where: { schoolId_academicYear: { schoolId, academicYear } },
      create: { schoolId, academicYear, totalSeats },
      update: { totalSeats },
    });
  }

  async runRteLottery(schoolId: string, academicYear: string) {
    const quota = await this.prisma.rteQuotaAllocation.findUnique({
      where: { schoolId_academicYear: { schoolId, academicYear } },
    });
    if (!quota) throw new NotFoundError("RTE quota not configured");
    if (quota.lotteryDone) throw new ConflictError("Lottery already conducted");

    const rteApplicants = await this.prisma.admissionApplication.findMany({
      where: { schoolId, isRteQuota: true, status: "SUBMITTED" },
    });

    // Shuffle and select up to totalSeats
    const shuffled = rteApplicants.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, quota.totalSeats);
    const waitlisted = shuffled.slice(quota.totalSeats);

    await this.prisma.$transaction([
      ...selected.map((a) =>
        this.prisma.admissionApplication.update({ where: { id: a.id }, data: { status: "OFFERED" } })
      ),
      ...waitlisted.map((a) =>
        this.prisma.admissionApplication.update({ where: { id: a.id }, data: { status: "WAITLISTED" } })
      ),
      this.prisma.rteQuotaAllocation.update({
        where: { schoolId_academicYear: { schoolId, academicYear } },
        data: { lotteryDone: true, lotteryDate: new Date(), allocatedSeats: selected.length },
      }),
    ]);

    return { selected: selected.length, waitlisted: waitlisted.length };
  }

  // ─── Convert to Student (on seat confirmation + fee payment) ─────────────────

  async confirmAdmission(applicationId: string) {
    const app = await this.prisma.admissionApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundError("Application not found");
    if (app.status !== "OFFERED") throw new ConflictError("Application must be in OFFERED status to confirm");

    await this.prisma.admissionApplication.update({ where: { id: applicationId }, data: { status: "CONFIRMED" } });

    // Return stub for student record creation — actual student creation hits user-service + student-service
    return {
      applicationId,
      message: "Admission confirmed. Dispatch student creation event to student-service.",
      studentName: app.studentName,
      applyingForGrade: app.applyingForGrade,
    };
  }

  // ─── Funnel Analytics ─────────────────────────────────────────────────────────

  async getFunnelReport(schoolId: string) {
    const [total, followUp, converted, lost] = await Promise.all([
      this.prisma.enquiry.count({ where: { schoolId } }),
      this.prisma.enquiry.count({ where: { schoolId, status: "FOLLOW_UP" } }),
      this.prisma.enquiry.count({ where: { schoolId, status: "CONVERTED" } }),
      this.prisma.enquiry.count({ where: { schoolId, status: "LOST" } }),
    ]);

    const bySource = await this.prisma.enquiry.groupBy({
      by: ["source"],
      where: { schoolId },
      _count: true,
    });

    const [submitted, offered, confirmed, rejected] = await Promise.all([
      this.prisma.admissionApplication.count({ where: { schoolId, status: "SUBMITTED" } }),
      this.prisma.admissionApplication.count({ where: { schoolId, status: "OFFERED" } }),
      this.prisma.admissionApplication.count({ where: { schoolId, status: "CONFIRMED" } }),
      this.prisma.admissionApplication.count({ where: { schoolId, status: "REJECTED" } }),
    ]);

    return {
      enquiries: { total, followUp, converted, lost, conversionRate: total > 0 ? +(converted / total * 100).toFixed(1) : 0 },
      sourceBreakdown: bySource.map((s) => ({ source: s.source, count: s._count })),
      applications: { submitted, offered, confirmed, rejected },
    };
  }
}
