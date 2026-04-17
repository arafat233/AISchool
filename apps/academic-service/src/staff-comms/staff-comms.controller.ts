import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { StaffCommsService } from "./staff-comms.service";

@UseGuards(AuthGuard("jwt"))
@Controller("staff-comms")
export class StaffCommsController {
  constructor(private readonly svc: StaffCommsService) {}

  // ─── Circulars ────────────────────────────────────────────────────────────────

  @Post("circulars")
  publishCircular(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.publishCircular(req.user.schoolId!, { ...body, publishedBy: req.user.id });
  }

  @Get("circulars")
  getCirculars(@Req() req: Request & { user: RequestUser }, @Query("department") dept?: string) {
    return this.svc.getCirculars(req.user.schoolId!, dept);
  }

  @Post("circulars/:id/read")
  markRead(@Req() req: Request & { user: RequestUser }, @Param("id") circularId: string) {
    return this.svc.markRead(circularId, req.user.id);
  }

  @Get("circulars/:id/read-status")
  getReadStatus(@Param("id") circularId: string) {
    return this.svc.getReadStatus(circularId);
  }

  // ─── Direct Messages ──────────────────────────────────────────────────────────

  @Post("messages")
  sendMessage(
    @Req() req: Request & { user: RequestUser },
    @Body("receiverId") receiverId: string,
    @Body("message") message: string,
  ) {
    return this.svc.sendMessage(req.user.schoolId!, req.user.id, receiverId, message);
  }

  @Get("messages/inbox")
  getInbox(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getInbox(req.user.schoolId!, req.user.id);
  }

  @Get("messages/conversation/:otherUserId")
  getConversation(@Req() req: Request & { user: RequestUser }, @Param("otherUserId") otherId: string) {
    return this.svc.getConversation(req.user.schoolId!, req.user.id, otherId);
  }

  @Post("messages/conversation/:otherUserId/read")
  markRead2(@Req() req: Request & { user: RequestUser }, @Param("otherUserId") otherId: string) {
    return this.svc.markMessagesRead(req.user.schoolId!, otherId, req.user.id);
  }

  @Post("messages/:id/flag")
  flagMessage(@Param("id") id: string) {
    return this.svc.flagMessage(id);
  }
}
