import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { NotificationService } from "./notification.service";

@UseGuards(AuthGuard("jwt"))
@Controller("notifications")
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  @Get() getMyNotifications(@Req() req: Request & { user: RequestUser }) { return this.svc.getNotifications(req.user.id); }
  @Patch(":id/read") markRead(@Param("id") id: string, @Req() req: Request & { user: RequestUser }) { return this.svc.markRead(id, req.user.id); }

  @Post("templates") createTemplate(@Req() req: Request & { user: RequestUser }, @Body() body: any) { return this.svc.createTemplate(req.user.tenantId, body); }
  @Get("templates") getTemplates(@Req() req: Request & { user: RequestUser }) { return this.svc.getTemplates(req.user.tenantId); }

  @Post("send/email") sendEmail(@Body() body: { to: string; subject: string; html: string }) { return this.svc.sendEmail(body.to, body.subject, body.html); }
  @Post("send/sms") sendSms(@Body() body: { to: string; message: string }) { return this.svc.sendSms(body.to, body.message); }

  @Get("health") health() { return { status: "ok", service: "notification-service" }; }
}
