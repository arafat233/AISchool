import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Academic Year ────────────────────────────────────────────────────────
  async createAcademicYear(schoolId: string, data: { name: string; startDate: string; endDate: string; isCurrent?: boolean }) {
    if (data.isCurrent) {
      await this.prisma.academicYear.updateMany({ where: { schoolId, isCurrent: true }, data: { isCurrent: false } });
    }
    return this.prisma.academicYear.create({ data: { schoolId, name: data.name, startDate: new Date(data.startDate), endDate: new Date(data.endDate), isCurrent: data.isCurrent ?? false } });
  }

  async getAcademicYears(schoolId: string) {
    return this.prisma.academicYear.findMany({ where: { schoolId }, orderBy: { startDate: "desc" } });
  }

  // ─── Grade Levels ─────────────────────────────────────────────────────────
  async createGradeLevel(schoolId: string, data: { name: string; numericLevel: number }) {
    const exists = await this.prisma.gradeLevel.findFirst({ where: { schoolId, name: data.name } });
    if (exists) throw new ConflictError(`Grade ${data.name} already exists`);
    return this.prisma.gradeLevel.create({ data: { schoolId, ...data } });
  }

  async getGradeLevels(schoolId: string) {
    return this.prisma.gradeLevel.findMany({ where: { schoolId }, include: { sections: true }, orderBy: { numericLevel: "asc" } });
  }

  // ─── Sections ─────────────────────────────────────────────────────────────
  async createSection(schoolId: string, data: { name: string; gradeLevelId: string; capacity?: number }) {
    return this.prisma.section.create({ data: { schoolId, name: data.name, gradeLevelId: data.gradeLevelId, capacity: data.capacity } });
  }

  async getSections(schoolId: string, gradeLevelId?: string) {
    return this.prisma.section.findMany({
      where: { schoolId, ...(gradeLevelId ? { gradeLevelId } : {}) },
      include: { gradeLevel: true, classTeacher: { include: { staff: true } } },
      orderBy: [{ gradeLevel: { numericLevel: "asc" } }, { name: "asc" }],
    });
  }

  // ─── Subjects ─────────────────────────────────────────────────────────────
  async createSubject(schoolId: string, data: { name: string; code: string; isElective?: boolean }) {
    const exists = await this.prisma.subject.findFirst({ where: { schoolId, code: data.code } });
    if (exists) throw new ConflictError(`Subject code ${data.code} already exists`);
    return this.prisma.subject.create({ data: { schoolId, name: data.name, code: data.code, isElective: data.isElective ?? false } });
  }

  async getSubjects(schoolId: string) {
    return this.prisma.subject.findMany({ where: { schoolId }, orderBy: { name: "asc" } });
  }

  async assignSubjectToClass(data: { gradeLevelId: string; subjectId: string; weeklyPeriods?: number; isCompulsory?: boolean }) {
    return this.prisma.classSubject.upsert({
      where: { gradeLevelId_subjectId: { gradeLevelId: data.gradeLevelId, subjectId: data.subjectId } },
      update: { weeklyPeriods: data.weeklyPeriods, isCompulsory: data.isCompulsory },
      create: { gradeLevelId: data.gradeLevelId, subjectId: data.subjectId, weeklyPeriods: data.weeklyPeriods ?? 5, isCompulsory: data.isCompulsory ?? true },
    });
  }

  // ─── Timetable ────────────────────────────────────────────────────────────
  async createTimetableSlot(data: {
    sectionId: string; subjectId: string; staffId: string;
    dayOfWeek: number; periodNo: number; startTime: string; endTime: string; academicYearId: string;
  }) {
    // Conflict detection: same section + day + period
    const conflict = await this.prisma.timetableSlot.findFirst({
      where: { sectionId: data.sectionId, dayOfWeek: data.dayOfWeek, periodNo: data.periodNo, academicYearId: data.academicYearId },
    });
    if (conflict) throw new ConflictError(`Period ${data.periodNo} on day ${data.dayOfWeek} is already assigned`);

    // Also check teacher double-booking
    const teacherConflict = await this.prisma.timetableSlot.findFirst({
      where: { staffId: data.staffId, dayOfWeek: data.dayOfWeek, startTime: data.startTime, academicYearId: data.academicYearId },
    });
    if (teacherConflict) throw new ConflictError(`Teacher is already assigned another class at this time`);

    return this.prisma.timetableSlot.create({ data: { ...data, startTime: data.startTime, endTime: data.endTime } });
  }

  async getTimetable(sectionId: string, academicYearId: string) {
    return this.prisma.timetableSlot.findMany({
      where: { sectionId, academicYearId },
      include: { subject: true, staff: true },
      orderBy: [{ dayOfWeek: "asc" }, { periodNo: "asc" }],
    });
  }

  async deleteTimetableSlot(id: string) {
    return this.prisma.timetableSlot.delete({ where: { id } });
  }
}
