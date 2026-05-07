import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Worker, Job } from "bullmq";
import { QUEUES } from "@school-erp/events";
import { WebhookService } from "./webhook.service";

/**
 * Listens on internal BullMQ event queues and dispatches webhooks
 * to all registered school endpoints subscribed to those events.
 */
@Injectable()
export class WebhookProcessor implements OnModuleInit {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly webhookService: WebhookService) {}

  onModuleInit() {
    const connection = {
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
    };

    // student_enrolled
    new Worker(
      QUEUES.STUDENT_ENROLLED,
      async (job: Job) => {
        const { schoolId, ...payload } = job.data;
        await this.webhookService.dispatch(schoolId, "student_enrolled", payload);
        this.logger.log(`Webhook dispatched: student_enrolled for school ${schoolId}`);
      },
      { connection },
    );

    // fee_paid
    new Worker(
      QUEUES.FEE_PAYMENT_RECEIVED,
      async (job: Job) => {
        const { schoolId, ...payload } = job.data;
        if (schoolId) {
          await this.webhookService.dispatch(schoolId, "fee_paid", payload);
          this.logger.log(`Webhook dispatched: fee_paid for school ${schoolId}`);
        }
      },
      { connection },
    );

    // result_published
    new Worker(
      QUEUES.EXAM_RESULT_PUBLISHED,
      async (job: Job) => {
        const { schoolId, ...payload } = job.data;
        await this.webhookService.dispatch(schoolId, "result_published", payload);
        this.logger.log(`Webhook dispatched: result_published for school ${schoolId}`);
      },
      { connection },
    );

    this.logger.log("WebhookProcessor workers started (student_enrolled, fee_paid, result_published)");
  }
}
