import {
  Body, Controller, Delete, Get, Param, Post, Put, Query,
  Req, UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { CourseService } from "./course.service";
import { ProgressService } from "./progress.service";
import { LiveClassService, MeetingProvider } from "./live-class.service";
import { SyllabusService, TopicStatus } from "./syllabus.service";

@UseGuards(AuthGuard("jwt"))
@Controller("lms")
export class LmsController {
  constructor(
    private readonly course: CourseService,
    private readonly progress: ProgressService,
    private readonly liveClass: LiveClassService,
    private readonly syllabus: SyllabusService,
  ) {}

  // ─── Courses ─────────────────────────────────────────────────────────────────

  @Post("courses")
  createCourse(
    @Req() req: Request & { user: RequestUser },
    @Body() body: { title: string; description?: string; subjectId: string; gradeLevelId: string; thumbnailUrl?: string; teacherStaffId?: string },
  ) {
    return this.course.createCourse(req.user.schoolId!, body);
  }

  @Get("courses")
  getCourses(
    @Req() req: Request & { user: RequestUser },
    @Query("subjectId") subjectId?: string,
    @Query("gradeLevelId") gradeLevelId?: string,
  ) {
    return this.course.getCourses(req.user.schoolId!, { subjectId, gradeLevelId });
  }

  @Get("courses/:id")
  getCourse(@Param("id") id: string) {
    return this.course.getCourse(id);
  }

  // ─── Units ────────────────────────────────────────────────────────────────────

  @Post("courses/:courseId/units")
  createUnit(@Param("courseId") courseId: string, @Body() body: { title: string; description?: string }) {
    return this.course.createUnit(courseId, body);
  }

  @Put("courses/:courseId/units/reorder")
  reorderUnits(@Param("courseId") courseId: string, @Body("orderedIds") orderedIds: string[]) {
    return this.course.reorderUnits(courseId, orderedIds);
  }

  // ─── Lessons ─────────────────────────────────────────────────────────────────

  @Post("units/:unitId/lessons")
  createLesson(
    @Param("unitId") unitId: string,
    @Body() body: { title: string; type: any; contentUrl?: string; articleHtml?: string; durationSeconds?: number; description?: string; isFreePreview?: boolean },
  ) {
    return this.course.createLesson(unitId, body);
  }

  @Put("lessons/:id")
  updateLesson(@Param("id") id: string, @Body() body: any) {
    return this.course.updateLesson(id, body);
  }

  @Delete("lessons/:id")
  deleteLesson(@Param("id") id: string) {
    return this.course.deleteLesson(id);
  }

  // ─── eTextbook embed ─────────────────────────────────────────────────────────

  @Post("units/:unitId/etextbook")
  createETextbook(
    @Param("unitId") unitId: string,
    @Body() body: { title: string; iframeUrl: string; chapterLink?: string },
  ) {
    return this.course.createETextbookEmbed(unitId, body);
  }

  // ─── Quiz ────────────────────────────────────────────────────────────────────

  @Post("lessons/:lessonId/quiz")
  attachQuiz(
    @Param("lessonId") lessonId: string,
    @Body() body: { onlineTestId: string; maxAttempts?: number; passScore?: number },
  ) {
    return this.course.attachQuiz(lessonId, body);
  }

  // ─── Discussion threads ──────────────────────────────────────────────────────

  @Post("lessons/:lessonId/discussions")
  createDiscussion(
    @Req() req: Request & { user: RequestUser },
    @Param("lessonId") lessonId: string,
    @Body() body: { content: string; parentId?: string },
  ) {
    return this.course.createDiscussion(lessonId, req.user.id, body);
  }

  @Get("lessons/:lessonId/discussions")
  getDiscussions(@Param("lessonId") lessonId: string) {
    return this.course.getDiscussions(lessonId);
  }

  @Put("discussions/:id/moderate")
  moderateDiscussion(@Param("id") id: string, @Body("action") action: "APPROVE" | "REMOVE") {
    return this.course.moderateDiscussion(id, action);
  }

  // ─── Student progress ────────────────────────────────────────────────────────

  @Post("progress/lessons/:lessonId")
  updateProgress(
    @Req() req: Request & { user: RequestUser },
    @Param("lessonId") lessonId: string,
    @Body() body: { watchedSeconds?: number; scrollPercent?: number; isCompleted?: boolean },
  ) {
    return this.progress.updateProgress(req.user.id, lessonId, body);
  }

  @Get("progress/courses/:courseId")
  getCourseProgress(@Req() req: Request & { user: RequestUser }, @Param("courseId") courseId: string) {
    return this.progress.getCourseProgress(req.user.id, courseId);
  }

  @Get("progress/streak")
  getLearningStreak(@Req() req: Request & { user: RequestUser }) {
    return this.progress.getLearningStreak(req.user.id);
  }

  @Get("progress/time-on-task")
  getTimeOnTask(
    @Req() req: Request & { user: RequestUser },
    @Query("courseId") courseId?: string,
  ) {
    return this.progress.getTimeOnTask(req.user.id, courseId);
  }

  // ─── Course heatmap ───────────────────────────────────────────────────────────

  @Get("courses/:courseId/heatmap")
  getCourseHeatmap(
    @Param("courseId") courseId: string,
    @Query("sectionId") sectionId: string,
  ) {
    return this.progress.getCourseHeatmap(courseId, sectionId);
  }

  // ─── Live classes ─────────────────────────────────────────────────────────────

  @Post("live-classes")
  scheduleLiveClass(
    @Req() req: Request & { user: RequestUser },
    @Body() body: { lessonId: string; title: string; scheduledAt: string; durationMinutes: number; provider: MeetingProvider; sectionId?: string; courseId?: string; description?: string },
  ) {
    return this.liveClass.scheduleLiveClass({
      ...body,
      scheduledAt: new Date(body.scheduledAt),
      hostStaffId: req.user.id,
    });
  }

  @Get("live-classes")
  getLiveClasses(
    @Query("courseId") courseId?: string,
    @Query("sectionId") sectionId?: string,
    @Query("hostStaffId") hostStaffId?: string,
    @Query("status") status?: string,
  ) {
    return this.liveClass.getLiveClasses({ courseId, sectionId, hostStaffId, status });
  }

  @Post("live-classes/:id/recording")
  saveRecording(@Param("id") id: string, @Body("recordingUrl") recordingUrl: string) {
    return this.liveClass.saveRecording(id, recordingUrl);
  }

  @Post("live-classes/:id/join")
  recordJoin(
    @Req() req: Request & { user: RequestUser },
    @Param("id") liveClassId: string,
    @Body("joinedAt") joinedAt?: string,
  ) {
    return this.liveClass.recordJoin(liveClassId, req.user.id, joinedAt ? new Date(joinedAt) : new Date());
  }

  @Get("live-classes/:id/attendance")
  getLiveClassAttendance(@Param("id") id: string) {
    return this.liveClass.getLiveClassAttendance(id);
  }

  @Put("live-classes/:id/status")
  updateLiveClassStatus(@Param("id") id: string, @Body("status") status: "LIVE" | "ENDED" | "CANCELLED") {
    return this.liveClass.updateLiveClassStatus(id, status);
  }

  // ─── Syllabus coverage ────────────────────────────────────────────────────────

  @Post("syllabus/topics/:topicId/status")
  markTopicStatus(
    @Req() req: Request & { user: RequestUser },
    @Param("topicId") syllabicTopicId: string,
    @Body() body: { status: TopicStatus; completedDate?: string; remarks?: string },
  ) {
    return this.syllabus.markTopicStatus({
      syllabicTopicId,
      staffId: req.user.id,
      status: body.status,
      completedDate: body.completedDate ? new Date(body.completedDate) : undefined,
      remarks: body.remarks,
    });
  }

  @Get("syllabus/coverage")
  getCoverageReport(
    @Query("subjectId") subjectId: string,
    @Query("classId") classId: string,
    @Query("staffId") staffId?: string,
  ) {
    return this.syllabus.getCoverageReport(subjectId, classId, staffId);
  }

  @Get("syllabus/pace-alerts")
  getPaceAlerts(@Req() req: Request & { user: RequestUser }) {
    return this.syllabus.getPaceAlerts(req.user.schoolId!);
  }
}
