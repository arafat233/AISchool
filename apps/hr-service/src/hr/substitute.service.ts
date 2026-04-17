import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

@Injectable()
export class SubstituteService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Mark free periods (teacher self-marks) ──────────────────────────────────

  async markFreePeriod(staffId: string, date: Date, periodNo: number) {
    return this.prisma.freeSlot.upsert({
      where: { staffId_date_periodNo: { staffId, date, periodNo } },
      update: { isAvailable: true },
      create: { staffId, date, periodNo, isAvailable: true },
    });
  }

  async removeFreePeriod(staffId: string, date: Date, periodNo: number) {
    return this.prisma.freeSlot.updateMany({ where: { staffId, date, periodNo }, data: { isAvailable: false } });
  }

  async getFreeSlots(schoolId: string, date: Date) {
    return this.prisma.freeSlot.findMany({
      where: { isAvailable: true, date, staff: { schoolId } },
      include: { staff: { include: { user: { include: { profile: true } }, teacherSubjects: { include: { subject: true } } } } },
    });
  }

  // ─── Auto-suggest substitute on leave ────────────────────────────────────────

  async suggestSubstitutes(absentStaffId: string, date: Date, periodNo: number, subjectId: string, schoolId: string) {
    // Find free teachers who teach the same subject
    const freeQualified = await this.prisma.freeSlot.findMany({
      where: {
        isAvailable: true, date, periodNo,
        staff: {
          schoolId,
          id: { not: absentStaffId },
          teacherSubjects: { some: { subjectId } },
        },
      },
      include: { staff: { include: { user: { include: { profile: true } } } } },
    });

    // Also check external pool
    const externalPool = await this.prisma.externalSubstitute.findMany({
      where: { schoolId, isActive: true, subjects: { has: subjectId } },
    });

    return {
      internal: freeQualified.map((s) => ({
        staffId: s.staffId,
        name: `${(s.staff.user as any).profile?.firstName ?? ""} ${(s.staff.user as any).profile?.lastName ?? ""}`.trim(),
        type: "INTERNAL",
      })),
      external: externalPool.map((e) => ({ id: e.id, name: e.name, phone: e.phone, dailyRate: e.dailyRate, type: "EXTERNAL" })),
    };
  }

  // ─── Book substitute ─────────────────────────────────────────────────────────

  async bookSubstitute(data: {
    absentStaffId: string; substituteStaffId?: string; externalSubstituteId?: string;
    date: Date; periodNo: number; gradeLevelId: string; sectionId: string; subjectId: string; schoolId: string;
  }) {
    return this.prisma.substituteBooking.create({
      data: {
        absentStaffId: data.absentStaffId,
        substituteStaffId: data.substituteStaffId,
        externalSubstituteId: data.externalSubstituteId,
        date: data.date, periodNo: data.periodNo,
        gradeLevelId: data.gradeLevelId, sectionId: data.sectionId, subjectId: data.subjectId,
        schoolId: data.schoolId, status: "CONFIRMED",
      },
    });
  }

  // ─── External substitute pool management ─────────────────────────────────────

  async addExternalSubstitute(schoolId: string, data: {
    name: string; phone: string; email?: string; subjects: string[];
    qualification?: string; dailyRate?: number;
  }) {
    return this.prisma.externalSubstitute.create({ data: { schoolId, ...data, isActive: true } });
  }

  async getExternalSubstitutePool(schoolId: string) {
    return this.prisma.externalSubstitute.findMany({ where: { schoolId, isActive: true }, orderBy: { name: "asc" } });
  }
}
