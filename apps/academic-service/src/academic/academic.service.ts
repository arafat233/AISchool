import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";
import { AcademicCacheService } from "../cache/academic-cache.service";

const TTL_1H = 3600;
const TTL_30M = 1800;

@Injectable()
export class AcademicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AcademicCacheService,
  ) {}

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
    const result = await this.prisma.gradeLevel.create({ data: { schoolId, ...data } });
    await this.cache.del(this.cache.gradeLevelsKey(schoolId));
    return result;
  }

  async getGradeLevels(schoolId: string) {
    const key = this.cache.gradeLevelsKey(schoolId);
    const cached = await this.cache.get<any[]>(key);
    if (cached) return cached;
    const data = await this.prisma.gradeLevel.findMany({ where: { schoolId }, include: { sections: true }, orderBy: { numericLevel: "asc" } });
    await this.cache.set(key, data, TTL_1H);
    return data;
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
    const result = await this.prisma.subject.create({ data: { schoolId, name: data.name, code: data.code, isElective: data.isElective ?? false } });
    await this.cache.del(this.cache.subjectsKey(schoolId));
    return result;
  }

  async getSubjects(schoolId: string) {
    const key = this.cache.subjectsKey(schoolId);
    const cached = await this.cache.get<any[]>(key);
    if (cached) return cached;
    const data = await this.prisma.subject.findMany({ where: { schoolId }, orderBy: { name: "asc" } });
    await this.cache.set(key, data, TTL_1H);
    return data;
  }

  async assignSubjectToClass(data: { gradeLevelId: string; subjectId: string; weeklyPeriods?: number; isCompulsory?: boolean }) {
    const result = await this.prisma.classSubject.upsert({
      where: { gradeLevelId_subjectId: { gradeLevelId: data.gradeLevelId, subjectId: data.subjectId } },
      update: { weeklyPeriods: data.weeklyPeriods, isCompulsory: data.isCompulsory },
      create: { gradeLevelId: data.gradeLevelId, subjectId: data.subjectId, weeklyPeriods: data.weeklyPeriods ?? 5, isCompulsory: data.isCompulsory ?? true },
    });
    // Grade level assignments changed — invalidate grade levels cache for the school
    // (we don't store schoolId here, but sections + grade levels cache will expire naturally)
    return result;
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

    const result = await this.prisma.timetableSlot.create({ data: { ...data, startTime: data.startTime, endTime: data.endTime } });
    await this.cache.del(this.cache.timetableKey(data.sectionId, data.academicYearId));
    return result;
  }

  async getTimetable(sectionId: string, academicYearId: string) {
    const key = this.cache.timetableKey(sectionId, academicYearId);
    const cached = await this.cache.get<any[]>(key);
    if (cached) return cached;
    const data = await this.prisma.timetableSlot.findMany({
      where: { sectionId, academicYearId },
      include: { subject: true, staff: true },
      orderBy: [{ dayOfWeek: "asc" }, { periodNo: "asc" }],
    });
    await this.cache.set(key, data, TTL_30M);
    return data;
  }

  async deleteTimetableSlot(id: string) {
    const slot = await this.prisma.timetableSlot.findUnique({ where: { id }, select: { sectionId: true, academicYearId: true } });
    const result = await this.prisma.timetableSlot.delete({ where: { id } });
    if (slot) await this.cache.del(this.cache.timetableKey(slot.sectionId, slot.academicYearId));
    return result;
  }
}
