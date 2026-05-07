import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Queue } from "bullmq";
import { QUEUES, DEFAULT_JOB_OPTIONS } from "@school-erp/events";
import { PrismaService } from "@school-erp/database";

/**
 * Scheduled jobs for the notification service.
 *
 * - Daily at 08:00 IST: enqueue attendance absent alerts for the previous school day
 * - Every Monday at 09:00 IST: enqueue fee reminder for overdue invoices
 */
@Injectable()
export class NotificationCron {
  private readonly logger = new Logger(NotificationCron.name);
  private readonly attendanceAlertQueue: Queue;
  private readonly feeReminderQueue: Queue;

  constructor(private readonly prisma: PrismaService) {
    const connection = {
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
    };
    this.attendanceAlertQueue = new Queue(QUEUES.ATTENDANCE_ALERT, { connection });
    this.feeReminderQueue = new Queue(QUEUES.FEE_REMINDER, { connection });
    this.attendanceAlertQueue.on("error", (err) => this.logger.error(`Queue error (attendance-alert): ${err.message}`, err.stack));
    this.feeReminderQueue.on("error", (err) => this.logger.error(`Queue error (fee-reminder): ${err.message}`, err.stack));
  }

  /** Daily 08:00 — absent alerts for yesterday */
  @Cron("0 8 * * 1-6") // Mon–Sat at 08:00
  async dailyAbsentAlerts() {
    this.logger.log("Running daily absent alerts cron");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Fetch all attendance sessions where students were absent yesterday
    const sessions = await this.prisma.attendanceSession.findMany({
      where: { date: yesterday },
      include: {
        records: { where: { status: "ABSENT" }, select: { studentId: true } },
      },
    });

    for (const session of sessions) {
      const absentIds = session.records.map((r) => r.studentId);
      if (absentIds.length === 0) continue;

      await this.attendanceAlertQueue.add(
        "attendance.absent.daily",
        {
          schoolId: session.schoolId,
          sectionId: session.sectionId,
          date: yesterday.toISOString(),
          absentStudentIds: absentIds,
          totalStudents: session.records.length,
        },
        DEFAULT_JOB_OPTIONS,
      );
    }

    this.logger.log(`Absent alerts enqueued for ${sessions.length} sessions`);
  }

  /** Weekly Monday 09:00 — fee reminders for overdue invoices */
  @Cron("0 9 * * 1") // Every Monday at 09:00
  async weeklyFeeReminders() {
    this.logger.log("Running weekly fee reminder cron");

    const overdueInvoices = await this.prisma.feeInvoice.findMany({
      where: {
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] as any[] },
        dueDate: { lt: new Date() },
      },
      select: { id: true, studentId: true, totalAmount: true, dueDate: true, schoolId: true },
      take: 500, // safety limit
    });

    for (const invoice of overdueInvoices) {
      await this.feeReminderQueue.add(
        "fee.reminder",
        {
          invoiceId: invoice.id,
          studentId: invoice.studentId,
          schoolId: invoice.schoolId,
          totalAmount: invoice.totalAmount,
          dueDate: invoice.dueDate.toISOString(),
        },
        DEFAULT_JOB_OPTIONS,
      );
    }

    this.logger.log(`Fee reminders enqueued for ${overdueInvoices.length} overdue invoices`);
  }
}
