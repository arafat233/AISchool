import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { VisitorService } from "./visitor.service";

@UseGuards(AuthGuard("jwt"))
@Controller("visitors")
export class VisitorController {
  constructor(private readonly svc: VisitorService) {}

  @Post()
  register(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.registerVisitor(req.user.schoolId!, { ...body, createdBy: req.user.id });
  }

  @Get()
  list(@Req() req: Request & { user: RequestUser }, @Query("date") date?: string) {
    return this.svc.getVisitors(req.user.schoolId!, date ? new Date(date) : undefined);
  }

  @Post(":id/checkout")
  checkout(@Param("id") id: string) {
    return this.svc.checkoutVisitor(id);
  }

  @Get("pass/:passNo")
  getByPass(@Param("passNo") passNo: string) {
    return this.svc.getVisitorByPass(passNo);
  }

  @Post("blacklist")
  addBlacklist(@Body("idNo") idNo: string) {
    return this.svc.addToBlacklist(idNo);
  }

  @Post("blacklist/remove")
  removeBlacklist(@Body("idNo") idNo: string) {
    return this.svc.removeFromBlacklist(idNo);
  }

  // ─── Gate passes ──────────────────────────────────────────────────────────────

  @Post("gate-passes")
  requestGatePass(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.requestGatePass(req.user.schoolId!, {
      ...body,
      issuedBy: req.user.id,
      expectedReturnTime: body.expectedReturnTime ? new Date(body.expectedReturnTime) : undefined,
    });
  }

  @Post("gate-passes/:id/approve")
  approveGatePass(@Param("id") id: string) {
    return this.svc.approveGatePass(id);
  }

  @Post("gate-passes/:id/return")
  recordReturn(@Param("id") id: string) {
    return this.svc.recordGatePassReturn(id);
  }

  @Get("gate-passes")
  getGatePasses(@Req() req: Request & { user: RequestUser }, @Query("studentId") studentId?: string) {
    return this.svc.getGatePasses(req.user.schoolId!, studentId);
  }

  // ─── Deliveries ───────────────────────────────────────────────────────────────

  @Post("deliveries")
  logDelivery(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.logDelivery(req.user.schoolId!, { ...body, createdBy: req.user.id });
  }

  @Post("deliveries/:id/collected")
  collected(@Param("id") id: string) {
    return this.svc.markDeliveryCollected(id);
  }
}
