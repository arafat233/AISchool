import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { FeeService } from "./fee.service";

@UseGuards(AuthGuard("jwt"))
@Controller("fees")
export class FeeController {
  constructor(private readonly svc: FeeService) {}

  @Post("heads") createHead(@Req() req: Request & { user: RequestUser }, @Body() body: any) { return this.svc.createFeeHead(req.user.schoolId!, body); }
  @Get("heads") getHeads(@Req() req: Request & { user: RequestUser }) { return this.svc.getFeeHeads(req.user.schoolId!); }
  @Post("structures") createStructure(@Req() req: Request & { user: RequestUser }, @Body() body: any) { return this.svc.createFeeStructure({ ...body, schoolId: req.user.schoolId! }); }

  @Post("invoices/generate")
  generate(@Req() req: Request & { user: RequestUser }, @Body() body: { sectionId: string; academicYearId: string; termId?: string }) {
    return this.svc.generateInvoicesForSection(req.user.schoolId!, body.sectionId, body.academicYearId, body.termId);
  }

  @Get("invoices/student/:studentId") studentInvoices(@Param("studentId") id: string) { return this.svc.getStudentInvoices(id); }
  @Get("invoices/outstanding") outstanding(@Req() req: Request & { user: RequestUser }, @Query("academicYearId") ayId: string) { return this.svc.getOutstandingReport(req.user.schoolId!, ayId); }

  @Post("invoices/:id/pay-cash") payCash(@Param("id") id: string, @Req() req: Request & { user: RequestUser }, @Body() body: any) { return this.svc.recordCashPayment(id, { ...body, receivedById: req.user.id }); }
  @Post("invoices/:id/razorpay-order") razorpayOrder(@Param("id") id: string) { return this.svc.createRazorpayOrder(id); }
  @Post("invoices/:id/verify-payment") verifyPayment(@Param("id") id: string, @Req() req: Request & { user: RequestUser }, @Body() body: any) { return this.svc.verifyOnlinePayment(id, { ...body, receivedById: req.user.id }); }
  @Post("invoices/:id/concession") applyConcession(@Param("id") id: string, @Req() req: Request & { user: RequestUser }, @Body() body: any) { return this.svc.applyConcession({ ...body, invoiceId: id, approvedById: req.user.id }); }

  @Get("health") health() { return { status: "ok", service: "fee-service" }; }
}
