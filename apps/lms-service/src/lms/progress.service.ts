import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";

const VIDEO_COMPLETE_THRESHOLD = 0.80;   // 80% watched → complete
const PDF_COMPLETE_THRESHOLD = 1.0;      // scrolled to end

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Update lesson progress ──────────────────────────────────────────────────

  async updateProgress(studentId: string, lessonId: string, data: {
    watchedSeconds?: number;    // for VIDEO / AUDIO
    scrollPercent?: number;     // for PDF (0–100)
    isCompleted?: boolean;      // can be forced (e.g. ARTICLE opened = complete)
  }) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) return;

    let isCompleted = data.isCompleted ?? false;

    if (lesson.type === "VIDEO" || lesson.type === "AUDIO") {
      if (data.watchedSeconds && lesson.durationSeconds > 0) {
        const ratio = data.watchedSeconds / lesson.durationSeconds;
        if (ratio >= VIDEO_COMPLETE_THRESHOLD) isCompleted = true;
      }
    } else if (lesson.type === "PDF") {
      if (data.scrollPercent !== undefined && data.scrollPercent >= PDF_COMPLETE_THRESHOLD * 100) {
        isCompleted = true;
      }
    } else {
      // ARTICLE, LIVE_CLASS, AR_CONTENT — opening it counts as complete
      isCompleted = true;
    }

    const existing = await this.prisma.lessonProgress.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } },
    });

    if (existing?.isCompleted) return existing; // Already complete — don't regress

    return this.prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      update: {
        watchedSeconds: data.watchedSeconds ?? existing?.watchedSeconds,
        scrollPercent: data.scrollPercent ?? existing?.scrollPercent,
        isCompleted,
        completedAt: isCompleted ? (existing?.completedAt ?? new Date()) : undefined,
      },
      create: {
        studentId,
        lessonId,
        watchedSeconds: data.watchedSeconds ?? 0,
        scrollPercent: data.scrollPercent ?? 0,
        isCompleted,
        completedAt: isCompleted ? new Date() : undefined,
      },
    });
  }

  // ─── Get course progress for a student ──────────────────────────────────────

  async getCourseProgress(studentId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { units: { include: { lessons: true } } },
    });
    if (!course) return null;

    const allLessons = course.units.flatMap((u: any) => u.lessons);
    const lessonIds = allLessons.map((l: any) => l.id);

    const completedRecords = await this.prisma.lessonProgress.findMany({
      where: { studentId, lessonId: { in: lessonIds }, isCompleted: true },
    });

    const completedSet = new Set(completedRecords.map((r) => r.lessonId));

    const unitProgress = course.units.map((unit: any) => {
      const unitLessons = unit.lessons.length;
      const unitCompleted = unit.lessons.filter((l: any) => completedSet.has(l.id)).length;
      return { unitId: unit.id, unitTitle: unit.title, total: unitLessons, completed: unitCompleted, percent: unitLessons > 0 ? +((unitCompleted / unitLessons) * 100).toFixed(1) : 0 };
    });

    const totalLessons = allLessons.length;
    const completedCount = completedRecords.length;

    return {
      courseId,
      courseTitle: course.title,
      totalLessons,
      completedLessons: completedCount,
      percentComplete: totalLessons > 0 ? +((completedCount / totalLessons) * 100).toFixed(1) : 0,
      unitProgress,
    };
  }

  // ─── Learning streak ─────────────────────────────────────────────────────────

  async getLearningStreak(studentId: string): Promise<{ currentStreak: number; longestStreak: number }> {
    const progressDates = await this.prisma.lessonProgress.findMany({
      where: { studentId, isCompleted: true },
      select: { completedAt: true },
      orderBy: { completedAt: "desc" },
    });

    const days = [...new Set(
      progressDates
        .filter((p) => p.completedAt)
        .map((p) => p.completedAt!.toISOString().split("T")[0]),
    )].sort((a, b) => b.localeCompare(a));

    if (!days.length) return { currentStreak: 0, longestStreak: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 1;

    const today = new Date().toISOString().split("T")[0];
    // Check if today or yesterday has activity (streak is still alive)
    const lastDay = days[0];
    const diffFromToday = Math.floor((new Date(today).getTime() - new Date(lastDay).getTime()) / 86400000);
    if (diffFromToday > 1) {
      currentStreak = 0;
    } else {
      for (let i = 1; i < days.length; i++) {
        const diff = Math.floor((new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86400000);
        if (diff === 1) {
          streak++;
        } else {
          if (streak > longestStreak) longestStreak = streak;
          streak = 1;
        }
      }
      currentStreak = streak;
    }
    longestStreak = Math.max(longestStreak, currentStreak);

    return { currentStreak, longestStreak };
  }

  // ─── Time on task ────────────────────────────────────────────────────────────

  async getTimeOnTask(studentId: string, courseId?: string): Promise<{ totalSeconds: number; totalHours: number }> {
    const where: any = { studentId };
    if (courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: courseId }, include: { units: { include: { lessons: { select: { id: true } } } } } });
      const lessonIds = (course?.units ?? []).flatMap((u: any) => u.lessons.map((l: any) => l.id));
      where.lessonId = { in: lessonIds };
    }

    const result = await this.prisma.lessonProgress.aggregate({ where, _sum: { watchedSeconds: true } });
    const total = result._sum.watchedSeconds ?? 0;
    return { totalSeconds: total, totalHours: +(total / 3600).toFixed(2) };
  }

  // ─── Class-level completion heatmap ──────────────────────────────────────────

  async getCourseHeatmap(courseId: string, sectionId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { units: { include: { lessons: { orderBy: { orderIndex: "asc" } } }, orderBy: { orderIndex: "asc" } } },
    });
    if (!course) return null;

    const students = await this.prisma.student.findMany({ where: { sectionId }, select: { id: true, rollNo: true, user: { select: { firstName: true, lastName: true } } } });
    const studentIds = students.map((s) => s.id);
    const allLessons = course.units.flatMap((u: any) => u.lessons);
    const lessonIds = allLessons.map((l: any) => l.id);

    const allProgress = await this.prisma.lessonProgress.findMany({
      where: { studentId: { in: studentIds }, lessonId: { in: lessonIds } },
    });

    const progressMap = new Map<string, Set<string>>();
    for (const p of allProgress) {
      if (p.isCompleted) {
        if (!progressMap.has(p.studentId)) progressMap.set(p.studentId, new Set());
        progressMap.get(p.studentId)!.add(p.lessonId);
      }
    }

    // Lesson drop-off: % of students who completed each lesson
    const lessonDropOff = allLessons.map((lesson: any) => {
      const completedCount = studentIds.filter((sid) => progressMap.get(sid)?.has(lesson.id)).length;
      return { lessonId: lesson.id, lessonTitle: lesson.title, completionRate: studentIds.length > 0 ? +((completedCount / studentIds.length) * 100).toFixed(1) : 0 };
    });

    // Per-student completion %
    const studentRows = students.map((s) => {
      const completed = progressMap.get(s.id)?.size ?? 0;
      return { studentId: s.id, rollNo: s.rollNo, name: `${(s.user as any)?.firstName ?? ""} ${(s.user as any)?.lastName ?? ""}`.trim(), completedLessons: completed, totalLessons: lessonIds.length, percent: lessonIds.length > 0 ? +((completed / lessonIds.length) * 100).toFixed(1) : 0 };
    });

    return { courseId, courseTitle: course.title, lessonDropOff, studentRows };
  }
}
