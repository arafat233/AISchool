import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";
import type { RequestUser } from "@school-erp/types";
import { CalendarService } from "./calendar.service";

@Controller("calendar")
export class CalendarController {
  constructor(private readonly svc: CalendarService) {}

  @UseGuards(AuthGuard("jwt"))
  @Post("events")
  createEvent(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.createEvent(req.user.schoolId!, {
      ...body,
      date: new Date(body.date),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      createdBy: req.user.id,
    });
  }

  @Get("events")
  getEvents(
    @Query("schoolId") schoolId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("type") type?: string,
  ) {
    return this.svc.getEvents(
      schoolId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      type,
    );
  }

  @UseGuards(AuthGuard("jwt"))
  @Patch("events/:id")
  updateEvent(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateEvent(id, body);
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete("events/:id")
  deleteEvent(@Param("id") id: string) {
    return this.svc.deleteEvent(id);
  }

  @Get("ical/:schoolId")
  async getICal(@Param("schoolId") schoolId: string, @Res() res: Response) {
    const ical = await this.svc.generateICal(schoolId);
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=school-calendar.ics");
    res.send(ical);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("working-days")
  getWorkingDays(
    @Query("schoolId") schoolId: string,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.svc.calculateWorkingDays(schoolId, new Date(from), new Date(to));
  }
}
