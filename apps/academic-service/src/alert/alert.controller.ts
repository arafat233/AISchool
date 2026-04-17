import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { AlertService } from "./alert.service";

@UseGuards(AuthGuard("jwt"))
@Controller("alerts")
export class AlertController {
  constructor(private readonly svc: AlertService) {}

  @Post("broadcast")
  broadcast(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.broadcastAlert(req.user.schoolId!, { ...body, sentBy: req.user.id });
  }

  @Get()
  getAlerts(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getAlerts(req.user.schoolId!);
  }

  @Post(":id/acknowledge")
  acknowledge(@Req() req: Request & { user: RequestUser }, @Param("id") alertId: string) {
    return this.svc.acknowledgeAlert(alertId, req.user.id);
  }

  @Get(":id/acknowledgements")
  getAcknowledgements(@Param("id") alertId: string) {
    return this.svc.getAcknowledgementStatus(alertId);
  }

  @Post(":id/all-clear")
  allClear(@Param("id") alertId: string, @Body("message") message: string) {
    return this.svc.sendAllClear(alertId, message);
  }
}
