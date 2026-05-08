import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";
import type { RequestUser } from "@school-erp/types";
import { CalendarService } from "./calendar.service";
import { CreateCalendarEventDto, UpdateCalendarEventDto } from "./dto/calendar.dto";

@Controller("calendar")
export class CalendarController {
  constructor(private readonly svc: CalendarService) {}

  @UseGuards(AuthGuard("jwt"))
  @Post("events")
  createEvent(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateCalendarEventDto) {
    return this.svc.createEvent(req.user.schoolId!, {
      ...dto,
      date: new Date(dto.date),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      createdBy: req.user.id,
    });
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("events")
  getEvents(
    @Req() req: Request & { user: RequestUser },
    @Query("schoolId") schoolId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("type") type?: string,
  ) {
    return this.svc.getEvents(
      req.user.schoolId!,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      type,
    );
  }

  @UseGuards(AuthGuard("jwt"))
  @Patch("events/:id")
  updateEvent(@Param("id") id: string, @Body() dto: UpdateCalendarEventDto) {
    return this.svc.updateEvent(id, dto);
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete("events/:id")
  deleteEvent(@Param("id") id: string) {
    return this.svc.deleteEvent(id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("ical/:schoolId")
  async getICal(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Res() res: Response) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
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
