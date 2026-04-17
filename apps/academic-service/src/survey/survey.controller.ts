import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { SurveyService } from "./survey.service";

@UseGuards(AuthGuard("jwt"))
@Controller("surveys")
export class SurveyController {
  constructor(private readonly svc: SurveyService) {}

  @Post()
  create(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.createSurvey(req.user.schoolId!, {
      ...body, createdBy: req.user.id,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    });
  }

  @Get()
  list(@Req() req: Request & { user: RequestUser }, @Query("type") type?: string) {
    return this.svc.getSurveys(req.user.schoolId!, type);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.svc.getSurvey(id);
  }

  @Post(":id/publish")
  publish(@Param("id") id: string) {
    return this.svc.publishSurvey(id);
  }

  @Post(":id/questions")
  addQuestion(@Param("id") surveyId: string, @Body() body: any) {
    return this.svc.addQuestion(surveyId, body);
  }

  @Put("questions/:id")
  updateQuestion(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateQuestion(id, body);
  }

  @Post(":id/respond")
  respond(@Req() req: Request & { user: RequestUser }, @Param("id") surveyId: string, @Body("answers") answers: any) {
    return this.svc.submitResponse(surveyId, req.user.id, answers);
  }

  @Get(":id/results")
  results(@Param("id") id: string) {
    return this.svc.getResults(id);
  }

  @Get("trends/:type")
  trends(@Req() req: Request & { user: RequestUser }, @Param("type") type: string) {
    return this.svc.getTrendComparison(req.user.schoolId!, type);
  }
}
