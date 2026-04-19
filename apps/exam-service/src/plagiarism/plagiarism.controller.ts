/**
 * Plagiarism endpoints consumed by:
 *  - Assignment service (triggers scan on submission)
 *  - Student portal (GET /plagiarism/pre-check/:submissionId — preview score)
 *  - Teacher portal (GET /plagiarism/trend/:assignmentId — class report)
 *  - Admin portal (GET /plagiarism/report/:schoolId — trend across classes/terms)
 */
import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from "@nestjs/common";
import { PlagiarismService } from "./plagiarism.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

class TriggerScanDto {
  submissionId!: string;
  assignmentId!: string;
  studentId!: string;
  schoolId!: string;
  submissionText!: string;
  isPreSubmissionCheck?: boolean;
}

@Controller("plagiarism")
@UseGuards(JwtAuthGuard)
export class PlagiarismController {
  constructor(private readonly svc: PlagiarismService) {}

  /** Called on assignment upload — fires async BullMQ job */
  @Post("scan")
  async triggerScan(@Body() dto: TriggerScanDto) {
    await this.svc.enqueueScan(dto);
    return { queued: true, submissionId: dto.submissionId };
  }

  /** Student fetches their own pre-submission score (deterrent UX) */
  @Get("pre-check/:submissionId")
  async preCheckResult(@Param("submissionId") submissionId: string) {
    return this.svc.getPreCheckResult(submissionId);
  }

  /** Teacher sees per-submission result */
  @Get("result/:submissionId")
  async getResult(@Param("submissionId") submissionId: string) {
    return this.svc.getResult(submissionId);
  }

  /** Teacher: similarity matrix for all submissions in an assignment */
  @Get("class-report/:assignmentId")
  async classReport(@Param("assignmentId") assignmentId: string) {
    return this.svc.getClassReport(assignmentId);
  }

  /** Admin / Teacher: plagiarism trend per class per term */
  @Get("trend/:schoolId")
  async trendReport(
    @Param("schoolId") schoolId: string,
    @Query("classId") classId?: string,
    @Query("termId") termId?: string,
  ) {
    return this.svc.getTrendReport({ schoolId, classId, termId });
  }
}
