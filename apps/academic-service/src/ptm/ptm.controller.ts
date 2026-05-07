import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { PtmService } from "./ptm.service";
import { CreatePtmEventDto, SetupSlotsDto, BookSlotDto } from "./dto/ptm.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("ptm")
export class PtmController {
  constructor(private readonly svc: PtmService) {}

  @Post("events")
  createEvent(@Req() req: Request & { user: RequestUser }, @Body() dto: CreatePtmEventDto) {
    return this.svc.createEvent(req.user.schoolId!, { ...dto, eventDate: new Date(dto.eventDate), createdBy: req.user.id });
  }

  @Get("events")
  getEvents(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getPtmEvents(req.user.schoolId!);
  }

  @Post("events/:id/slots")
  setupSlots(@Param("id") eventId: string, @Body() dto: SetupSlotsDto) {
    return this.svc.setupTeacherSlots(eventId, dto.staffId, { startTime: new Date(dto.startTime), endTime: new Date(dto.endTime) });
  }

  @Get("events/:id/slots")
  getSlots(@Param("id") eventId: string, @Query("staffId") staffId?: string) {
    return this.svc.getTeacherSlots(eventId, staffId);
  }

  @Post("slots/:slotId/book")
  bookSlot(@Req() req: Request & { user: RequestUser }, @Param("slotId") slotId: string, @Body() dto: BookSlotDto) {
    return this.svc.bookSlot(slotId, { parentId: req.user.id, studentId: dto.studentId, notes: dto.notes });
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
