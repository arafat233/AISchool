import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

@Injectable()
export class TrainingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Training calendar ────────────────────────────────────────────────────────

  async createTraining(schoolId: string, data: {
    title: string; description?: string; trainerName?: string; trainerOrg?: string;
    startDate: Date; endDate: Date; venue?: string; mode: "IN_PERSON" | "ONLINE" | "HYBRID";
    maxParticipants?: number; cpdHours?: number; category?: string;
  }) {
    return this.prisma.cpdTraining.create({ data: { schoolId, ...data, status: "SCHEDULED" } });
  }

  async getTrainings(schoolId: string, filters?: { status?: string; fromDate?: Date; toDate?: Date }) {
    return this.prisma.cpdTraining.findMany({
      where: {
        schoolId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.fromDate ? { startDate: { gte: filters.fromDate } } : {}),
        ...(filters?.toDate ? { endDate: { lte: filters.toDate } } : {}),
      },
      include: { _count: { select: { attendances: true } } },
      orderBy: { startDate: "asc" },
    });
  }

  async updateTraining(id: string, data: any) {
    return this.prisma.cpdTraining.update({ where: { id }, data });
  }

  // ─── Attendance records ───────────────────────────────────────────────────────

  async markAttendance(trainingId: string, staffId: string, attended: boolean) {
    const training = await this.prisma.cpdTraining.findUnique({ where: { id: trainingId } });
    if (!training) throw new NotFoundError("Training not found");

    return this.prisma.trainingAttendance.upsert({
      where: { trainingId_staffId: { trainingId, staffId } },
      update: { attended, cpdHoursEarned: attended ? (training.cpdHours ?? 0) : 0 },
      create: { trainingId, staffId, attended, cpdHoursEarned: attended ? (training.cpdHours ?? 0) : 0 },
    });
  }

  async getAttendance(trainingId: string) {
    return this.prisma.trainingAttendance.findMany({
      where: { trainingId },
      include: { staff: { include: { user: { include: { profile: true } } } } },
    });
  }

  // ─── CPD hours per staff ──────────────────────────────────────────────────────

  async getStaffCpdHours(staffId: string, fromDate?: Date, toDate?: Date) {
    const records = await this.prisma.trainingAttendance.findMany({
      where: {
        staffId, attended: true,
        ...(fromDate || toDate ? {
          training: {
            ...(fromDate ? { startDate: { gte: fromDate } } : {}),
            ...(toDate ? { endDate: { lte: toDate } } : {}),
          },
        } : {}),
      },
      include: { training: { select: { title: true, startDate: true, cpdHours: true, category: true } } },
    });

    const totalHours = records.reduce((sum, r) => sum + (r.cpdHoursEarned ?? 0), 0);
    return { staffId, totalCpdHours: totalHours, records };
  }

  // ─── Effectiveness report ─────────────────────────────────────────────────────

  async getEffectivenessReport(trainingId: string) {
    const training = await this.prisma.cpdTraining.findUnique({ where: { id: trainingId } });
    if (!training) throw new NotFoundError("Training not found");

    const attendance = await this.prisma.trainingAttendance.findMany({ where: { trainingId } });
    const enrolled = attendance.length;
    const attended = attendance.filter((a) => a.attended).length;
    const totalCpdHours = attended * (training.cpdHours ?? 0);

    const feedback = await this.prisma.trainingFeedback.findMany({
      where: { trainingId },
      select: { rating: true, comments: true },
    });
    const avgRating = feedback.length > 0 ? +(feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(2) : null;

    return { trainingId, title: training.title, enrolled, attended, attendanceRate: enrolled > 0 ? +((attended / enrolled) * 100).toFixed(1) : 0, totalCpdHours, avgRating, feedbackCount: feedback.length };
  }

  async submitTrainingFeedback(trainingId: string, staffId: string, rating: number, comments?: string) {
    return this.prisma.trainingFeedback.upsert({
      where: { trainingId_staffId: { trainingId, staffId } },
      update: { rating, comments },
      create: { trainingId, staffId, rating, comments },
    });
  }
}
