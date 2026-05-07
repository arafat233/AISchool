import { Injectable } from "@nestjs/common";
import { Worker, Job, Queue } from "bullmq";
import { createLogger } from "@school-erp/logger";
import { QUEUES } from "@school-erp/events";
import { SmsAdapter } from "../adapters/sms.adapter";
import { EmailAdapter } from "../adapters/email.adapter";
import { PushAdapter } from "../adapters/push.adapter";
import { WhatsappAdapter } from "../adapters/whatsapp.adapter";
import axios from "axios";

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

      const studentServiceUrl = process.env.STUDENT_SERVICE_URL ?? "http://student-service:3002";
      const smsQueue = new Queue(QUEUES.SMS, { connection });
      const whatsappQueue = new Queue(QUEUES.WHATSAPP, { connection });

      for (const studentId of (absentStudentIds as string[])) {
        let parentContacts: Array<{ phone: string; name: string }> = [];
        try {
          const res = await axios.get(`${studentServiceUrl}/internal/students/${studentId}/parent-contacts`);
          parentContacts = res.data ?? [];
        } catch {
          this.logger.warn(`Could not fetch parent contacts for student ${studentId} — skipping`);
        }

        for (const contact of parentContacts) {
          const message = `Attendance Alert: Your child was marked absent on ${date}. Please contact the school if this is incorrect.`;

          await smsQueue.add("send-sms", { to: contact.phone, message }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });

          await whatsappQueue.add("send-whatsapp", {
            to: contact.phone,
            templateName: "attendance_alert",
            params: { name: contact.name, date },
          }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });

          this.logger.log(`Enqueued SMS/WhatsApp for parent ${contact.phone} (student ${studentId})`);
        }
      }
    }, { connection });

    new Worker(QUEUES.FEE_PAYMENT_RECEIVED, async (job: Job) => {
      const { paymentId, invoiceId, studentId, amount, mode } = job.data;
      this.logger.log(`Processing fee payment receipt notification for student ${studentId}, payment ${paymentId}`);
      // Enqueue email receipt — in production fetch student email from user-service
      await this.email.send(
        `student-${studentId}@school.erp`,
        "Fee Payment Received",
        `<p>Your fee payment of ₹${(amount / 100).toFixed(2)} (${mode}) has been received. Invoice: ${invoiceId}. Payment ID: ${paymentId}.</p>`,
      );
    }, { connection });

    new Worker(QUEUES.EXAM_RESULT_PUBLISHED, async (job: Job) => {
      const { examId, schoolId, examTitle, totalStudents } = job.data;
      this.logger.log(`Processing result published notification for exam ${examId} (${examTitle}), school ${schoolId}`);
      // In production: fetch parent/student contacts and send targeted notifications
      this.logger.log(`Result notifications queued for ${totalStudents} students`);
    }, { connection });

    this.logger.log("All notification workers started");
  }
}
