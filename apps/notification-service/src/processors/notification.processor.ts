import { Injectable } from "@nestjs/common";
import { Worker, Job } from "bullmq";
import { createLogger } from "@school-erp/logger";
import { QUEUES } from "@school-erp/events";
import { SmsAdapter } from "../adapters/sms.adapter";
import { EmailAdapter } from "../adapters/email.adapter";
import { PushAdapter } from "../adapters/push.adapter";
import { WhatsappAdapter } from "../adapters/whatsapp.adapter";

@Injectable()
export class NotificationProcessor {
  private readonly logger = createLogger("NotificationProcessor");

  constructor(
    private readonly sms: SmsAdapter,
    private readonly email: EmailAdapter,
    private readonly push: PushAdapter,
    private readonly whatsapp: WhatsappAdapter,
  ) {}

  startWorker() {
    const connection = { host: process.env.REDIS_HOST || "localhost", port: Number(process.env.REDIS_PORT) || 6379 };

    new Worker(QUEUES.EMAIL, async (job: Job) => {
      const { to, subject, html } = job.data;
      await this.email.send(to, subject, html);
      this.logger.log(`Email sent to ${to}`);
    }, { connection, concurrency: 5 });

    new Worker(QUEUES.SMS, async (job: Job) => {
      const { to, message } = job.data;
      await this.sms.send(to, message);
      this.logger.log(`SMS sent to ${to}`);
    }, { connection, concurrency: 10 });

    new Worker(QUEUES.PUSH, async (job: Job) => {
      const { token, title, body, data } = job.data;
      await this.push.send(token, title, body, data);
      this.logger.log(`Push sent to token ${token.slice(0, 8)}...`);
    }, { connection, concurrency: 20 });

    new Worker(QUEUES.WHATSAPP, async (job: Job) => {
      const { to, templateName, params } = job.data;
      await this.whatsapp.send(to, templateName, params);
      this.logger.log(`WhatsApp sent to ${to}`);
    }, { connection, concurrency: 5 });

    new Worker(QUEUES.ATTENDANCE_ALERT, async (job: Job) => {
      const { absentStudentIds, date } = job.data;
      this.logger.log(`Processing absent alerts for ${absentStudentIds.length} students on ${date}`);
      // TODO: fetch parent contacts and enqueue SMS/WhatsApp jobs
    }, { connection });

    this.logger.log("All notification workers started");
  }
}
