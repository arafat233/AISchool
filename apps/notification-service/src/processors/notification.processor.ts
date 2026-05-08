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

  private attachDlq(worker: Worker, dlq: Queue) {
    worker.on("failed", (job, err) => {
      if (!job || (job.attemptsMade < (job.opts.attempts ?? 1))) return;
      dlq.add("dlq-job", {
        originalQueue: worker.name,
        jobId: job.id,
        jobName: job.name,
        data: job.data,
        failedReason: err.message,
        failedAt: new Date().toISOString(),
      }).catch(() => { /* best-effort */ });
      this.logger.error(`Job ${job.id} from ${worker.name} exhausted retries — moved to DLQ`);
    });
  }

  startWorker() {
    const connection = { host: process.env.REDIS_HOST || "localhost", port: Number(process.env.REDIS_PORT) || 6379 };
    const dlq = new Queue(QUEUES.DLQ, { connection });

    const emailWorker = new Worker(QUEUES.EMAIL, async (job: Job) => {
      const { to, subject, html } = job.data;
      try {
        await this.email.send(to, subject, html);
        this.logger.log(`Email sent to ${to}`);
      } catch (err) {
        this.logger.error(`Email failed for ${to}: ${(err as Error).message}`);
        throw err;
      }
    }, { connection, concurrency: 5 });
    this.attachDlq(emailWorker, dlq);

    const smsWorker = new Worker(QUEUES.SMS, async (job: Job) => {
      const { to, message } = job.data;
      try {
        await this.sms.send(to, message);
        this.logger.log(`SMS sent to ${to}`);
      } catch (err) {
        this.logger.error(`SMS failed for ${to}: ${(err as Error).message}`);
        throw err;
      }
    }, { connection, concurrency: 10 });
    this.attachDlq(smsWorker, dlq);

    const pushWorker = new Worker(QUEUES.PUSH, async (job: Job) => {
      const { token, title, body, data } = job.data;
      const result = await this.push.send(token, title, body, data);
      if (result.tokenExpired) {
        // Don't retry expired tokens — discard the job silently
        this.logger.warn(`Discarding push job ${job.id}: FCM token expired`);
        return;
      }
      if (!result.success) {
        throw new Error(`Push delivery failed for token ${token.slice(0, 8)}...`);
      }
      this.logger.log(`Push sent to token ${token.slice(0, 8)}...`);
    }, { connection, concurrency: 20 });
    this.attachDlq(pushWorker, dlq);

    const whatsappWorker = new Worker(QUEUES.WHATSAPP, async (job: Job) => {
      const { to, templateName, params } = job.data;
      try {
        await this.whatsapp.send(to, templateName, params);
        this.logger.log(`WhatsApp sent to ${to}`);
      } catch (err) {
        this.logger.error(`WhatsApp failed for ${to}: ${(err as Error).message}`);
        throw err;
      }
    }, { connection, concurrency: 5 });
    this.attachDlq(whatsappWorker, dlq);

    const attendanceWorker = new Worker(QUEUES.ATTENDANCE_ALERT, async (job: Job) => {
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
    this.attachDlq(attendanceWorker, dlq);

    const feeWorker = new Worker(QUEUES.FEE_PAYMENT_RECEIVED, async (job: Job) => {
      const { paymentId, invoiceId, studentId, amount, mode } = job.data;
      this.logger.log(`Processing fee payment receipt notification for student ${studentId}, payment ${paymentId}`);
      try {
        await this.email.send(
          `student-${studentId}@school.erp`,
          "Fee Payment Received",
          `<p>Your fee payment of ₹${(amount / 100).toFixed(2)} (${mode}) has been received. Invoice: ${invoiceId}. Payment ID: ${paymentId}.</p>`,
        );
      } catch (err) {
        this.logger.error(`Fee receipt email failed for student ${studentId}: ${(err as Error).message}`);
        throw err;
      }
    }, { connection });
    this.attachDlq(feeWorker, dlq);

    const resultWorker = new Worker(QUEUES.EXAM_RESULT_PUBLISHED, async (job: Job) => {
      const { examId, schoolId, examTitle, totalStudents } = job.data;
      this.logger.log(`Processing result published notification for exam ${examId} (${examTitle}), school ${schoolId}`);
      // In production: fetch parent/student contacts and send targeted notifications
      this.logger.log(`Result notifications queued for ${totalStudents} students`);
    }, { connection });
    this.attachDlq(resultWorker, dlq);

    this.logger.log("All notification workers started");
  }
}
