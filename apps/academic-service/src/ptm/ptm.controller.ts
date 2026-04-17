import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { PtmService } from "./ptm.service";

@UseGuards(AuthGuard("jwt"))
@Controller("ptm")
export class PtmController {
  constructor(private readonly svc: PtmService) {}

  @Post("events")
  createEvent(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.createEvent(req.user.schoolId!, { ...body, eventDate: new Date(body.eventDate), createdBy: req.user.id });
  }

  @Get("events")
  getEvents(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getPtmEvents(req.user.schoolId!);
  }

  @Post("events/:id/slots")
  setupSlots(@Param("id") eventId: string, @Body() body: any) {
    return this.svc.setupTeacherSlots(eventId, body.staffId, { startTime: new Date(body.startTime), endTime: new Date(body.endTime) });
  }

  @Get("events/:id/slots")
  getSlots(@Param("id") eventId: string, @Query("staffId") staffId?: string) {
    return this.svc.getTeacherSlots(eventId, staffId);
  }

  @Post("slots/:slotId/book")
  bookSlot(@Req() req: Request & { user: RequestUser }, @Param("slotId") slotId: string, @Body() body: any) {
    return this.svc.bookSlot(slotId, { parentId: req.user.id, studentId: body.studentId, notes: body.notes });
  }

  @Post("bookings/:id/cancel")
  cancelBooking(@Param("id") id: string) {
    return this.svc.cancelBooking(id);
  }

  @Get("events/:id/teacher-schedule")
  getTeacherSchedule(@Param("id") eventId: string, @Req() req: Request & { user: RequestUser }) {
    return this.svc.getTeacherSchedule(eventId, req.user.id);
  }

  @Get("bookings/:id/qr")
  getQR(@Param("id") id: string) {
    return this.svc.getBookingQR(id);
  }

  @Post("bookings/:id/remarks")
  addRemarks(@Req() req: Request & { user: RequestUser }, @Param("id") id: string, @Body("remarks") remarks: string) {
    return this.svc.addRemarks(id, req.user.id, remarks);
  }

  @Get("bookings/:id/remarks")
  getRemarks(@Param("id") id: string) {
    return this.svc.getRemarks(id);
  }
}
