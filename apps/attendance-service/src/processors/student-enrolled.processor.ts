import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Worker, Job } from "bullmq";
import { QUEUES } from "@school-erp/events";
import type { StudentEnrolledPayload } from "@school-erp/events";
import { PrismaService } from "@school-erp/database";

/**
 * Listens for student.enrolled events and initialises the student's
 * attendance record in the current academic year (sets default status as PRESENT
 * for today so the student appears in the roll call immediately).
 */
@Injectable()
export class StudentEnrolledProcessor implements OnModuleInit {
  private readonly logger = new Logger(StudentEnrolledProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const connection = {
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
    };

    new Worker(
      QUEUES.STUDENT_ENROLLED,
      async (job: Job<StudentEnrolledPayload>) => {
        const { studentId, schoolId, sectionId, academicYearId } = job.data;
        this.logger.log(`Processing student.enrolled for attendance init: student ${studentId}`);

        // Ensure an attendance session exists for today in this section
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const session = await this.prisma.attendanceSession.upsert({
          where: { schoolId_sectionId_date: { schoolId, sectionId, date: today } },
          update: {},
          create: { schoolId, sectionId, date: today, createdById: "system" },
        });

        // Create an attendance record for this student (PRESENT by default on enrolment day)
        await this.prisma.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId } },
          update: {},
          create: { sessionId: session.id, studentId, status: "PRESENT" },
        });

        this.logger.log(`Attendance record initialised for student ${studentId}`);
      },
      { connection, concurrency: 5 },
    );

    this.logger.log("StudentEnrolledProcessor (attendance) worker started");
  }
}
