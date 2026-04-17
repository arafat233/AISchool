import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { HomeworkService } from "./homework.service";

@UseGuards(AuthGuard("jwt"))
@Controller("homework")
export class HomeworkController {
  constructor(private readonly svc: HomeworkService) {}

  // ─── Teacher: post homework ──────────────────────────────────────────────────

  @Post()
  post(
    @Req() req: Request & { user: RequestUser },
    @Body() body: {
      classId: string; sectionId?: string; subjectId: string;
      description: string; dueDate: string; assignedDate?: string;
      attachmentUrl?: string; requiresAcknowledgement?: boolean;
    },
  ) {
    return this.svc.postHomework({
      schoolId: req.user.schoolId!,
      teacherStaffId: req.user.id,
      classId: body.classId,
      sectionId: body.sectionId,
      subjectId: body.subjectId,
      description: body.description,
      dueDate: new Date(body.dueDate),
      assignedDate: body.assignedDate ? new Date(body.assignedDate) : undefined,
      attachmentUrl: body.attachmentUrl,
      requiresAcknowledgement: body.requiresAcknowledgement,
    });
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateHomework(id, { ...body, dueDate: body.dueDate ? new Date(body.dueDate) : undefined });
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.svc.deleteHomework(id);
  }

  // ─── Student/parent: today's homework checklist ──────────────────────────────

  @Get("student/:studentId/today")
  getTodaysHomework(@Param("studentId") studentId: string) {
    return this.svc.getTodaysHomework(studentId);
  }

  // ─── Parent acknowledgement ──────────────────────────────────────────────────

  @Post(":id/acknowledge")
  acknowledge(
    @Req() req: Request & { user: RequestUser },
    @Param("id") homeworkId: string,
    @Body("studentId") studentId: string,
  ) {
    return this.svc.acknowledgeHomework(homeworkId, studentId, req.user.id);
  }

  // ─── Analytics: homework load per class ──────────────────────────────────────

  @Get("analytics/load")
  getLoadAnalytics(
    @Req() req: Request & { user: RequestUser },
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.svc.getHomeworkLoadAnalytics(
      req.user.schoolId!,
      new Date(from),
      new Date(to),
    );
  }
}
