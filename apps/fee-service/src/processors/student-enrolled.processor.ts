import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Worker, Job } from "bullmq";
import { QUEUES } from "@school-erp/events";
import type { StudentEnrolledPayload } from "@school-erp/events";
import { FeeService } from "../fee/fee.service";

@Injectable()
export class StudentEnrolledProcessor implements OnModuleInit {
  private readonly logger = new Logger(StudentEnrolledProcessor.name);

  constructor(private readonly feeService: FeeService) {}

  onModuleInit() {
    const connection = {
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
    };

    new Worker(
      QUEUES.STUDENT_ENROLLED,
      async (job: Job<StudentEnrolledPayload>) => {
        const { studentId, schoolId, sectionId, academicYearId } = job.data;
        this.logger.log(`Processing student.enrolled for student ${studentId}`);

        // Generate fee invoices for the newly enrolled student's section
        // This is idempotent — generateInvoicesForSection skips existing invoices
        await this.feeService.generateInvoicesForSection(schoolId, sectionId, academicYearId);
        this.logger.log(`Fee invoices generated for student ${studentId} (section ${sectionId})`);
      },
      { connection, concurrency: 5 },
    );

    this.logger.log("StudentEnrolledProcessor worker started");
  }
}
