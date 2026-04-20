import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const PII_KEY = Buffer.from(process.env.PII_ENCRYPTION_KEY!, "hex"); // 32-byte hex key required

function encrypt(val: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", PII_KEY, iv);
  const enc = Buffer.concat([cipher.update(val, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

function decrypt(val: string): string {
  const [ivHex, tagHex, encHex] = val.split(":");
  const decipher = createDecipheriv("aes-256-gcm", PII_KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]).toString("utf8");
}

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Staff onboarding ────────────────────────────────────────────────────────

  async createStaff(schoolId: string, data: {
    userId: string; employeeCode: string; designationId: string; departmentId?: string;
    joinDate: Date; confirmationDate?: Date;
    bankAccountNo?: string; bankIfsc?: string; bankName?: string;
    pfAccountNo?: string; esiNo?: string;
    panNo?: string; aadharNo?: string;
    emergencyContact?: string; bloodGroup?: string;
    qualifications?: any[];
  }) {
    return this.prisma.staff.create({
      data: {
        schoolId, userId: data.userId, employeeCode: data.employeeCode,
        designationId: data.designationId, departmentId: data.departmentId,
        joinDate: data.joinDate, confirmationDate: data.confirmationDate,
        bankAccountNo: data.bankAccountNo ? encrypt(data.bankAccountNo) : null,
        bankIfsc: data.bankIfsc, bankName: data.bankName,
        pfAccountNo: data.pfAccountNo, esiNo: data.esiNo,
        panNo: data.panNo ? encrypt(data.panNo) : null,
        aadharNo: data.aadharNo ? encrypt(data.aadharNo) : null,
        emergencyContact: data.emergencyContact, bloodGroup: data.bloodGroup,
        qualifications: data.qualifications ?? [],
      },
      include: { user: { include: { profile: true } }, designation: true, department: true },
    });
  }

  async updateStaff(id: string, data: any) {
    const update: any = { ...data };
    if (data.bankAccountNo) update.bankAccountNo = encrypt(data.bankAccountNo);
    if (data.panNo) update.panNo = encrypt(data.panNo);
    if (data.aadharNo) update.aadharNo = encrypt(data.aadharNo);
    return this.prisma.staff.update({ where: { id }, data: update });
  }

  async getStaff(id: string) {
    const s = await this.prisma.staff.findUnique({
      where: { id },
      include: { user: { include: { profile: true } }, designation: true, department: true, teacherSubjects: { include: { subject: true } } },
    });
    if (!s) throw new NotFoundError("Staff not found");
    // Decrypt sensitive fields before returning
    return {
      ...s,
      bankAccountNo: s.bankAccountNo ? decrypt(s.bankAccountNo) : null,
      panNo: s.panNo ? decrypt(s.panNo) : null,
      aadharNo: s.aadharNo ? decrypt(s.aadharNo) : null,
    };
  }

  async listStaff(schoolId: string, filters?: { departmentId?: string; designationId?: string; status?: string }) {
    return this.prisma.staff.findMany({
      where: {
        schoolId,
        ...(filters?.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters?.designationId ? { designationId: filters.designationId } : {}),
        ...(filters?.status ? { status: filters.status as any } : {}),
      },
      include: { user: { include: { profile: true } }, designation: true, department: true },
      orderBy: { joinDate: "desc" },
    });
  }

  // ─── Document upload ─────────────────────────────────────────────────────────

  async addDocument(staffId: string, data: { type: string; fileUrl: string; verificationStatus?: string; expiryDate?: Date }) {
    return this.prisma.staffDocument.create({
      data: { staffId, type: data.type, fileUrl: data.fileUrl, verificationStatus: data.verificationStatus ?? "PENDING", expiryDate: data.expiryDate },
    });
  }

  async getDocuments(staffId: string) {
    return this.prisma.staffDocument.findMany({ where: { staffId }, orderBy: { createdAt: "desc" } });
  }

  // ─── Probation tracking ──────────────────────────────────────────────────────

  async getProbationDueList(schoolId: string, withinDays = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);

    const staff = await this.prisma.staff.findMany({
      where: {
        schoolId,
        status: "ACTIVE",
        confirmationDate: null,
        joinDate: { lte: cutoff },
      },
      include: { user: { include: { profile: true } } },
    });

    // Probation period assumed 6 months from joinDate
    const today = new Date();
    return staff
      .map((s) => {
        const probationEnd = new Date(s.joinDate);
        probationEnd.setMonth(probationEnd.getMonth() + 6);
        const daysLeft = Math.ceil((probationEnd.getTime() - today.getTime()) / 86400000);
        return { staffId: s.id, name: `${(s.user as any).profile?.firstName ?? ""} ${(s.user as any).profile?.lastName ?? ""}`.trim(), joinDate: s.joinDate, probationEndDate: probationEnd, daysLeft };
      })
      .filter((s) => s.daysLeft <= withinDays);
  }

  async confirmStaff(staffId: string, confirmationDate: Date) {
    return this.prisma.staff.update({ where: { id: staffId }, data: { confirmationDate } });
  }

  // ─── Subject-teacher + class-teacher mapping ─────────────────────────────────

  async assignSubject(staffId: string, data: { subjectId: string; gradeLevelId: string; sectionId?: string }) {
    return this.prisma.teacherSubject.upsert({
      where: { staffId_subjectId_gradeLevelId: { staffId, subjectId: data.subjectId, gradeLevelId: data.gradeLevelId } },
      update: { sectionId: data.sectionId },
      create: { staffId, subjectId: data.subjectId, gradeLevelId: data.gradeLevelId, sectionId: data.sectionId },
    });
  }

  async removeSubject(staffId: string, subjectId: string, gradeLevelId: string) {
    return this.prisma.teacherSubject.delete({ where: { staffId_subjectId_gradeLevelId: { staffId, subjectId, gradeLevelId } } });
  }

  async assignClassTeacher(staffId: string, data: { gradeLevelId: string; sectionId: string; academicYearId: string }) {
    return this.prisma.classTeacher.upsert({
      where: { sectionId_academicYearId: { sectionId: data.sectionId, academicYearId: data.academicYearId } },
      update: { staffId },
      create: { staffId, gradeLevelId: data.gradeLevelId, sectionId: data.sectionId, academicYearId: data.academicYearId },
    });
  }
}
