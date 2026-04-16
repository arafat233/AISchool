import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";
import { QUEUES, DEFAULT_JOB_OPTIONS } from "@school-erp/events";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "@school-erp/utils";
import { BulkAttendanceDto } from "../dto/bulk-attendance.dto";

@Injectable()
export class AttendanceService {
  private notificationQueue: Queue;

  constructor(private readonly prisma: PrismaService) {
    this.notificationQueue = new Queue(QUEUES.ATTENDANCE_ALERT, {
      connection: { host: process.env.REDIS_HOST || "localhost", port: Number(process.env.REDIS_PORT) || 6379 },
    });
  }

  async createSession(schoolId: string, data: { sectionId: string; date: string; createdById: string }) {
    const existing = await this.prisma.attendanceSession.findFirst({
      where: { schoolId, sectionId: data.sectionId, date: new Date(data.date) },
    });
    if (existing) return existing;

    return this.prisma.attendanceSession.create({
      data: { schoolId, sectionId: data.sectionId, date: new Date(data.date), createdById: data.createdById },
    });
  }

  async bulkMark(sessionId: string, dto: BulkAttendanceDto, markedById: string) {
    const session = await this.prisma.attendanceSession.findUniqueOrThrow({ where: { id: sessionId }, include: { section: true } });

    // Upsert all records in a transaction
    const ops = dto.records.map((r) =>
      this.prisma.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId, studentId: r.studentId } },
        update: { status: r.status as any, remark: r.remark, markedById },
        create: { sessionId, studentId: r.studentId, status: r.status as any, remark: r.remark, markedById },
      }),
    );
    await this.prisma.$transaction(ops);

    // Mark session as finalised
    await this.prisma.attendanceSession.update({ where: { id: sessionId }, data: { isFinalized: true } });

    // Emit absent alert jobs for notification service
    const absentIds = dto.records.filter((r) => r.status === "ABSENT").map((r) => r.studentId);
    if (absentIds.length > 0) {
      await this.notificationQueue.add(
        "attendance-absent",
        { sessionId, sectionId: session.sectionId, absentStudentIds: absentIds, date: session.date },
        DEFAULT_JOB_OPTIONS,
      );
    }

    return { total: dto.records.length, absent: absentIds.length, present: dto.records.length - absentIds.length };
  }

  async getSessionRecords(sessionId: string) {
    return this.prisma.attendanceRecord.findMany({
      where: { sessionId },
      include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
      orderBy: { student: { firstName: "asc" } },
    });
  }

  async getStudentSummary(studentId: string, startDate: string, endDate: string) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        studentId,
        session: { date: { gte: new Date(startDate), lte: new Date(endDate) } },
      },
      include: { session: { select: { date: true } } },
    });

    const total = records.length;
    const present = records.filter((r) => ["PRESENT", "LATE", "HALF_DAY"].includes(r.status)).length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, percentage, records };
  }

  async getClassSummary(sectionId: string, date: string) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { sectionId, date: new Date(date) },
      include: {
        records: {
          include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
        },
      },
    });
    if (!session) return { date, sectionId, session: null, message: "No session found for this date" };
    return session;
  }

  async getBelowThreshold(schoolId: string, sectionId: string, academicYearId: string, thresholdPercent = 75) {
    // Get all students in section
    const students = await this.prisma.student.findMany({
      where: { schoolId, sectionId },
      select: { id: true, firstName: true, lastName: true, admissionNo: true },
    });

    const results = await Promise.all(
      students.map(async (s) => {
        const records = await this.prisma.attendanceRecord.findMany({ where: { studentId: s.id } });
        const total = records.length;
        const present = records.filter((r) => ["PRESENT", "LATE", "HALF_DAY"].includes(r.status)).length;
        const pct = total > 0 ? Math.round((present / total) * 100) : 0;
        return { ...s, totalDays: total, presentDays: present, percentage: pct };
      }),
    );

    return results.filter((r) => r.percentage < thresholdPercent);
  }
}
