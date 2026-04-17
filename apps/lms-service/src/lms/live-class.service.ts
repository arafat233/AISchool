import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

export type MeetingProvider = "ZOOM" | "GOOGLE_MEET" | "BBB";

function generateMeetingLink(provider: MeetingProvider, roomId: string): string {
  switch (provider) {
    case "ZOOM":       return `https://zoom.us/j/${roomId}`;
    case "GOOGLE_MEET": return `https://meet.google.com/${roomId}`;
    case "BBB":        return `https://bbb.school-erp.app/b/${roomId}`;
  }
}

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 12);
}

@Injectable()
export class LiveClassService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Schedule a live class ───────────────────────────────────────────────────

  async scheduleLiveClass(data: {
    lessonId: string;
    title: string;
    scheduledAt: Date;
    durationMinutes: number;
    provider: MeetingProvider;
    hostStaffId: string;
    sectionId?: string;
    courseId?: string;
    description?: string;
  }) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: data.lessonId } });
    if (!lesson) throw new NotFoundError("Lesson not found");

    const roomId = generateRoomId();
    const meetingLink = generateMeetingLink(data.provider, roomId);

    const liveClass = await this.prisma.liveClass.create({
      data: {
        lessonId: data.lessonId,
        title: data.title,
        scheduledAt: data.scheduledAt,
        durationMinutes: data.durationMinutes,
        provider: data.provider,
        meetingLink,
        roomId,
        hostStaffId: data.hostStaffId,
        sectionId: data.sectionId,
        courseId: data.courseId,
        description: data.description,
        status: "SCHEDULED",
      },
    });

    // Update lesson with live class link
    await this.prisma.lesson.update({
      where: { id: data.lessonId },
      data: { contentUrl: meetingLink },
    });

    return liveClass;
  }

  async getLiveClasses(filters: { courseId?: string; sectionId?: string; hostStaffId?: string; status?: string }) {
    return this.prisma.liveClass.findMany({
      where: {
        ...(filters.courseId ? { courseId: filters.courseId } : {}),
        ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
        ...(filters.hostStaffId ? { hostStaffId: filters.hostStaffId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: { lesson: true },
      orderBy: { scheduledAt: "asc" },
    });
  }

  // ─── Save recording after live class ends ────────────────────────────────────

  async saveRecording(liveClassId: string, recordingUrl: string) {
    const liveClass = await this.prisma.liveClass.findUnique({ where: { id: liveClassId } });
    if (!liveClass) throw new NotFoundError("Live class not found");

    const updated = await this.prisma.liveClass.update({
      where: { id: liveClassId },
      data: { recordingUrl, status: "ENDED" },
    });

    // Persist recording on the lesson too
    await this.prisma.lesson.update({
      where: { id: liveClass.lessonId },
      data: { recordingUrl },
    });

    return updated;
  }

  // ─── Auto-attendance: student joined within first 10 min ────────────────────

  async recordJoin(liveClassId: string, studentId: string, joinedAt: Date) {
    const liveClass = await this.prisma.liveClass.findUnique({ where: { id: liveClassId } });
    if (!liveClass) throw new NotFoundError("Live class not found");

    const diffMinutes = (joinedAt.getTime() - new Date(liveClass.scheduledAt).getTime()) / 60000;
    const markedPresent = diffMinutes <= 10; // within first 10 min

    const record = await this.prisma.liveClassAttendance.upsert({
      where: { liveClassId_studentId: { liveClassId, studentId } },
      update: { joinedAt, markedPresent },
      create: { liveClassId, studentId, joinedAt, markedPresent },
    });

    // Also mark the lesson as complete for this student if present
    if (markedPresent) {
      await this.prisma.lessonProgress.upsert({
        where: { studentId_lessonId: { studentId, lessonId: liveClass.lessonId } },
        update: { isCompleted: true, completedAt: joinedAt },
        create: { studentId, lessonId: liveClass.lessonId, isCompleted: true, completedAt: joinedAt, watchedSeconds: 0, scrollPercent: 0 },
      });
    }

    return record;
  }

  async getLiveClassAttendance(liveClassId: string) {
    return this.prisma.liveClassAttendance.findMany({
      where: { liveClassId },
      include: { student: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });
  }

  async updateLiveClassStatus(liveClassId: string, status: "LIVE" | "ENDED" | "CANCELLED") {
    return this.prisma.liveClass.update({ where: { id: liveClassId }, data: { status } });
  }
}
