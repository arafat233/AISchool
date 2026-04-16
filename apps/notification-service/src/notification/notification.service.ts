import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { PrismaService } from "@school-erp/database";
import { QUEUES, DEFAULT_JOB_OPTIONS } from "@school-erp/events";

@Injectable()
export class NotificationService {
  private readonly emailQueue: Queue;
  private readonly smsQueue: Queue;
  private readonly pushQueue: Queue;

  constructor(private readonly prisma: PrismaService) {
    const connection = { host: process.env.REDIS_HOST || "localhost", port: Number(process.env.REDIS_PORT) || 6379 };
    this.emailQueue = new Queue(QUEUES.EMAIL, { connection });
    this.smsQueue = new Queue(QUEUES.SMS, { connection });
    this.pushQueue = new Queue(QUEUES.PUSH, { connection });
  }

  async sendEmail(to: string, subject: string, html: string) {
    return this.emailQueue.add("send-email", { to, subject, html }, DEFAULT_JOB_OPTIONS);
  }

  async sendSms(to: string, message: string) {
    return this.smsQueue.add("send-sms", { to, message }, DEFAULT_JOB_OPTIONS);
  }

  async sendPush(token: string, title: string, body: string, data?: Record<string, string>) {
    return this.pushQueue.add("send-push", { token, title, body, data }, DEFAULT_JOB_OPTIONS);
  }

  async createTemplate(tenantId: string, data: { name: string; channel: string; subject?: string; body: string; language?: string }) {
    return this.prisma.notificationTemplate.create({ data: { tenantId, ...data } });
  }

  async getTemplates(tenantId: string) {
    return this.prisma.notificationTemplate.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
  }

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true, readAt: new Date() } });
  }
}
