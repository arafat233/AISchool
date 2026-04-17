import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

const OVERLOAD_THRESHOLD = 3; // flag if avg homework/class/day exceeds this

@Injectable()
export class HomeworkService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Post homework (teacher) ─────────────────────────────────────────────────

  async postHomework(data: {
    schoolId: string;
    teacherStaffId: string;
    classId: string;
    sectionId?: string;
    subjectId: string;
    description: string;
    dueDate: Date;
    assignedDate?: Date;
    attachmentUrl?: string;
    requiresAcknowledgement?: boolean;
  }) {
    return this.prisma.homework.create({
      data: {
        schoolId: data.schoolId,
        teacherStaffId: data.teacherStaffId,
        gradeLevelId: data.classId,
        sectionId: data.sectionId,
        subjectId: data.subjectId,
        description: data.description,
        dueDate: data.dueDate,
        assignedDate: data.assignedDate ?? new Date(),
        attachmentUrl: data.attachmentUrl,
        requiresAcknowledgement: data.requiresAcknowledgement ?? false,
      },
      include: { subject: true, class: true },
    });
  }

  async updateHomework(id: string, data: Partial<{ description: string; dueDate: Date; attachmentUrl: string; requiresAcknowledgement: boolean }>) {
    return this.prisma.homework.update({ where: { id }, data });
  }

  async deleteHomework(id: string) {
    return this.prisma.homework.delete({ where: { id } });
  }

  // ─── Student/parent view — today's checklist ─────────────────────────────────

  async getTodaysHomework(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { gradeLevelId: true, sectionId: true },
    });
    if (!student) throw new NotFoundError("Student not found");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const homework = await this.prisma.homework.findMany({
      where: {
        gradeLevelId: student.gradeLevelId!,
        OR: [{ sectionId: student.sectionId }, { sectionId: null }],
        dueDate: { gte: today },
      },
      include: {
        subject: { select: { name: true } },
        acknowledgements: { where: { studentId } },
      },
      orderBy: { dueDate: "asc" },
    });

    return homework.map((hw: any) => ({
      id: hw.id,
      subjectName: hw.subject.name,
      description: hw.description,
      dueDate: hw.dueDate,
      requiresAcknowledgement: hw.requiresAcknowledgement,
      acknowledged: hw.acknowledgements.length > 0,
      attachmentUrl: hw.attachmentUrl,
    }));
  }

  // ─── Parent acknowledgement ──────────────────────────────────────────────────

  async acknowledgeHomework(homeworkId: string, studentId: string, acknowledgedBy: string) {
    const hw = await this.prisma.homework.findUnique({ where: { id: homeworkId } });
    if (!hw) throw new NotFoundError("Homework not found");

    if (!hw.requiresAcknowledgement) {
      return { message: "Acknowledgement not required for this homework" };
    }

    return this.prisma.homeworkAcknowledgement.upsert({
      where: { homeworkId_studentId: { homeworkId, studentId } },
      update: { acknowledgedBy, acknowledgedAt: new Date() },
      create: { homeworkId, studentId, acknowledgedBy, acknowledgedAt: new Date() },
    });
  }

  // ─── Homework load analytics ─────────────────────────────────────────────────

  async getHomeworkLoadAnalytics(schoolId: string, fromDate: Date, toDate: Date) {
    const homework = await this.prisma.homework.findMany({
      where: { schoolId, assignedDate: { gte: fromDate, lte: toDate } },
      include: { gradeLevel: { select: { name: true } }, subject: { select: { name: true } } },
    });

    // Group by gradeLevelId → date → count
    const classDateMap = new Map<string, { className: string; dates: Map<string, number> }>();

    for (const hw of homework) {
      const dateKey = (hw.assignedDate ?? hw.dueDate).toISOString().split("T")[0];
      if (!classDateMap.has(hw.gradeLevelId)) {
        classDateMap.set(hw.gradeLevelId, { className: (hw.gradeLevel as any).name, dates: new Map() });
      }
      const entry = classDateMap.get(hw.gradeLevelId)!;
      entry.dates.set(dateKey, (entry.dates.get(dateKey) ?? 0) + 1);
    }

    const dayRange = Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;

    const analytics = Array.from(classDateMap.entries()).map(([classId, info]) => {
      const totalHw = Array.from(info.dates.values()).reduce((a, b) => a + b, 0);
      const activeDays = info.dates.size;
      const avgPerDay = dayRange > 0 ? +(totalHw / dayRange).toFixed(2) : 0;
      const maxInOneDay = Math.max(...Array.from(info.dates.values()));

      return {
        classId,
        className: info.className,
        totalHomework: totalHw,
        activeDays,
        avgHomeworkPerDay: avgPerDay,
        maxInOneDay,
        overloaded: avgPerDay > OVERLOAD_THRESHOLD,
        overloadAlert: avgPerDay > OVERLOAD_THRESHOLD
          ? `Class ${info.className} averages ${avgPerDay} homework/day (threshold: ${OVERLOAD_THRESHOLD})`
          : null,
      };
    });

    return {
      period: { from: fromDate, to: toDate },
      overloadThreshold: OVERLOAD_THRESHOLD,
      classAnalytics: analytics.sort((a, b) => b.avgHomeworkPerDay - a.avgHomeworkPerDay),
      overloadedClasses: analytics.filter((a) => a.overloaded),
    };
  }
}
