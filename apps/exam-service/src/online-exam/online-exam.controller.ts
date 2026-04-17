import {
  Body, Controller, Delete, Get, Param, Post, Put, Query,
  Req, UploadedFile, UseGuards, UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { QuestionBankService } from "./question-bank.service";
import { TestBuilderService } from "./test-builder.service";
import { TestDeliveryService } from "./test-delivery.service";

@UseGuards(AuthGuard("jwt"))
@Controller("online-exam")
export class OnlineExamController {
  constructor(
    private readonly qb: QuestionBankService,
    private readonly tb: TestBuilderService,
    private readonly td: TestDeliveryService,
  ) {}

  // ─── Question Bank ──────────────────────────────────────────────────────────

  @Post("questions")
  createQuestion(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.qb.createQuestion(req.user.schoolId!, body);
  }

  @Get("questions")
  getQuestions(
    @Req() req: Request & { user: RequestUser },
    @Query("subjectId") subjectId?: string,
    @Query("gradeLevelId") gradeLevelId?: string,
    @Query("difficulty") difficulty?: string,
    @Query("bloomLevel") bloomLevel?: string,
    @Query("type") type?: string,
    @Query("topic") topic?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.qb.getQuestions(req.user.schoolId!, {
      subjectId, gradeLevelId,
      difficulty: difficulty as any,
      bloomLevel: bloomLevel as any,
      type: type as any,
      topic, search,
      limit: limit ? +limit : undefined,
      offset: offset ? +offset : undefined,
    });
  }

  @Get("questions/:id")
  getQuestion(@Param("id") id: string) {
    return this.qb.getQuestion(id);
  }

  @Put("questions/:id")
  updateQuestion(@Param("id") id: string, @Body() body: any) {
    return this.qb.updateQuestion(id, body);
  }

  @Delete("questions/:id")
  deleteQuestion(@Param("id") id: string) {
    return this.qb.deleteQuestion(id);
  }

  @Post("questions/bulk-import")
  @UseInterceptors(FileInterceptor("file"))
  bulkImport(@Req() req: Request & { user: RequestUser }, @UploadedFile() file: Express.Multer.File) {
    return this.qb.bulkImportFromExcel(req.user.schoolId!, file.buffer);
  }

  // ─── Online Tests ────────────────────────────────────────────────────────────

  @Post("tests")
  createTest(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.tb.createOnlineTest(req.user.schoolId!, body);
  }

  @Get("tests")
  getTests(
    @Req() req: Request & { user: RequestUser },
    @Query("sectionId") sectionId?: string,
    @Query("subjectId") subjectId?: string,
    @Query("status") status?: string,
  ) {
    return this.tb.getOnlineTests(req.user.schoolId!, { sectionId, subjectId, status });
  }

  @Get("tests/:id")
  getTest(@Param("id") id: string) {
    return this.tb.getOnlineTest(id);
  }

  @Post("tests/:id/questions")
  addQuestions(@Param("id") testId: string, @Body("questionIds") questionIds: string[]) {
    return this.tb.addQuestionsToTest(testId, questionIds);
  }

  @Delete("tests/:id/questions/:questionId")
  removeQuestion(@Param("id") testId: string, @Param("questionId") questionId: string) {
    return this.tb.removeQuestionFromTest(testId, questionId);
  }

  @Post("tests/:id/auto-pick")
  autoPick(@Param("id") testId: string, @Body() config: any) {
    return this.tb.autoPickQuestions(testId, config);
  }

  @Post("tests/:id/publish")
  publishTest(@Param("id") id: string) {
    return this.tb.publishTest(id);
  }

  @Post("tests/:id/unpublish")
  unpublishTest(@Param("id") id: string) {
    return this.tb.unpublishTest(id);
  }

  @Get("tests/:id/blooms-report")
  bloomsReport(@Param("id") testId: string) {
    return this.tb.getBloomsReport(testId);
  }

  @Get("tests/:id/question-analytics")
  questionAnalytics(@Param("id") testId: string) {
    return this.td.getQuestionAnalytics(testId);
  }

  // ─── Test Delivery (student-facing) ──────────────────────────────────────────

  @Post("tests/:id/start")
  startAttempt(
    @Param("id") testId: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.td.startAttempt(testId, req.user.id);
  }

  @Post("attempts/:attemptId/answer")
  saveAnswer(@Param("attemptId") attemptId: string, @Body() body: any) {
    return this.td.saveAnswer(attemptId, body);
  }

  @Post("attempts/:attemptId/tab-switch")
  recordTabSwitch(@Param("attemptId") attemptId: string) {
    return this.td.recordTabSwitch(attemptId);
  }

  @Post("attempts/:attemptId/submit")
  submitAttempt(@Param("attemptId") attemptId: string) {
    return this.td.submitAttempt(attemptId, "manual");
  }

  // ─── Teacher review queue (subjective) ──────────────────────────────────────

  @Get("tests/:id/review-queue")
  reviewQueue(@Param("id") testId: string) {
    return this.td.getSubjectiveReviewQueue(testId);
  }

  @Post("review/:answerId/score")
  submitManualScore(@Param("answerId") answerId: string, @Body() body: any) {
    return this.td.submitManualScore(answerId, body);
  }

  @Get("health")
  health() { return { status: "ok", service: "exam-service/online-exam" }; }
}
