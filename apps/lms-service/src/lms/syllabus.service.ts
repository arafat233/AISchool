import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

export type TopicStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "REVISED";

const PACE_ALERT_THRESHOLD = 0.15; // alert if coverage is 15% behind expected pace

@Injectable()
export class SyllabusService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Mark topic status ───────────────────────────────────────────────────────

  async markTopicStatus(data: {
    syllabicTopicId: string;
    staffId: string;
    status: TopicStatus;
    completedDate?: Date;
    remarks?: string;
  }) {
    const topic = await this.prisma.syllabicTopic.findUnique({ where: { id: data.syllabicTopicId } });
    if (!topic) throw new NotFoundError("Syllabic topic not found");

    return this.prisma.syllabusProgress.upsert({
      where: { syllabicTopicId_staffId: { syllabicTopicId: data.syllabicTopicId, staffId: data.staffId } },
      update: {
        status: data.status,
        completedDate: data.status === "COMPLETED" ? (data.completedDate ?? new Date()) : data.completedDate,
        remarks: data.remarks,
      },
      create: {
        syllabicTopicId: data.syllabicTopicId,
        staffId: data.staffId,
        status: data.status,
        completedDate: data.status === "COMPLETED" ? (data.completedDate ?? new Date()) : undefined,
        remarks: data.remarks,
      },
    });
  }

  // ─── Coverage overview for a subject + class ─────────────────────────────────

  async getCoverageReport(subjectId: string, classId: string, staffId?: string) {
    const topics = await this.prisma.syllabicTopic.findMany({
      where: { subjectId, classId },
      include: {
        syllabusProgress: staffId ? { where: { staffId } } : true,
      },
      orderBy: { orderIndex: "asc" },
    });

    const total = topics.length;
    const completedTopics = topics.filter((t: any) =>
      t.syllabusProgress?.some((p: any) => p.status === "COMPLETED"),
    );
    const inProgressTopics = topics.filter((t: any) =>
      t.syllabusProgress?.some((p: any) => p.status === "IN_PROGRESS"),
    );

    const coveragePercent = total > 0 ? +((completedTopics.length / total) * 100).toFixed(1) : 0;

    // Expected pace: linear distribution over academic year
    const now = new Date();
    // Find active academic year for the school that owns this grade level
    const gradeLevel = await this.prisma.gradeLevel.findUnique({ where: { id: classId }, select: { schoolId: true } });
    const year = gradeLevel
      ? await this.prisma.academicYear.findFirst({ where: { schoolId: gradeLevel.schoolId, isActive: true }, orderBy: { startDate: "desc" } })
      : null;

    let paceAlert = false;
    let expectedPercent = 0;
    if (year) {
      const totalDays = (new Date(year.endDate).getTime() - new Date(year.startDate).getTime()) / 86400000;
      const elapsed = (now.getTime() - new Date(year.startDate).getTime()) / 86400000;
      expectedPercent = totalDays > 0 ? +Math.min((elapsed / totalDays) * 100, 100).toFixed(1) : 0;
      paceAlert = expectedPercent - coveragePercent > PACE_ALERT_THRESHOLD * 100;
    }

    return {
      subjectId,
      classId,
      totalTopics: total,
      completedCount: completedTopics.length,
      inProgressCount: inProgressTopics.length,
      coveragePercent,
      expectedPercent,
      paceAlert,
      paceAlertMessage: paceAlert
        ? `Coverage (${coveragePercent}%) is behind expected pace (${expectedPercent}%). ${Math.ceil((expectedPercent - coveragePercent) / 100 * total)} topics overdue.`
        : null,
      topics: topics.map((t: any) => ({
        id: t.id,
        title: t.title,
        orderIndex: t.orderIndex,
        status: t.syllabusProgress?.[0]?.status ?? "NOT_STARTED",
        completedDate: t.syllabusProgress?.[0]?.completedDate ?? null,
        remarks: t.syllabusProgress?.[0]?.remarks ?? null,
      })),
    };
  }

  // ─── Get topics behind pace (alert list for admin) ────────────────────────────

  async getPaceAlerts(schoolId: string) {
    const subjects = await this.prisma.classSubject.findMany({
      where: { gradeLevel: { schoolId } },
      include: { subject: true, gradeLevel: true },
    });

    const alerts: any[] = [];

    for (const cs of subjects) {
      const report = await this.getCoverageReport(cs.subjectId, cs.gradeLevelId);
      if (report.paceAlert) {
        alerts.push({
          subjectId: cs.subjectId,
          subjectName: (cs.subject as any).name,
          classId: cs.gradeLevelId,
          className: (cs.gradeLevel as any).name,
          coveragePercent: report.coveragePercent,
          expectedPercent: report.expectedPercent,
          gap: +(report.expectedPercent - report.coveragePercent).toFixed(1),
        });
      }
    }

    return alerts.sort((a, b) => b.gap - a.gap);
  }
}
