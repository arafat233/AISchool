import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { Roles, RolesGuard } from "@school-erp/utils";
import { FeeService } from "./fee.service";
import { CreateFeeHeadDto, CreateFeeStructureDto, RecordCashPaymentDto, VerifyOnlinePaymentDto, ApplyConcessionDto } from "./dto/fee.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("fees")
export class FeeController {
  constructor(private readonly svc: FeeService) {}

  @Roles("ADMIN", "SUPER_ADMIN", "ACCOUNTANT")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Post("heads") createHead(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateFeeHeadDto) { return this.svc.createFeeHead(req.user.schoolId!, dto); }
  @Get("heads") getHeads(@Req() req: Request & { user: RequestUser }) { return this.svc.getFeeHeads(req.user.schoolId!); }

  @Roles("ADMIN", "SUPER_ADMIN", "ACCOUNTANT")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Post("structures") createStructure(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateFeeStructureDto) { return this.svc.createFeeStructure({ ...dto, schoolId: req.user.schoolId! }); }

  @Roles("ADMIN", "SUPER_ADMIN", "ACCOUNTANT")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Post("invoices/generate")
  generate(@Req() req: Request & { user: RequestUser }, @Body() body: { sectionId: string; academicYearId: string; termId?: string }) {
    return this.svc.generateInvoicesForSection(req.user.schoolId!, body.sectionId, body.academicYearId, body.termId);
  }

  @Roles("ADMIN", "SUPER_ADMIN", "ACCOUNTANT", "STUDENT", "PARENT")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Get("invoices/student/:studentId") studentInvoices(@Param("studentId") id: string, @Req() req: Request & { user: RequestUser }) { return this.svc.getStudentInvoices(id, req.user.schoolId!); }
  @Get("invoices/outstanding") outstanding(@Req() req: Request & { user: RequestUser }, @Query("academicYearId") ayId: string) { return this.svc.getOutstandingReport(req.user.schoolId!, ayId); }

  @Roles("ADMIN", "SUPER_ADMIN", "ACCOUNTANT")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Post("invoices/:id/pay-cash") payCash(@Param("id") id: string, @Req() req: Request & { user: RequestUser }, @Body() dto: RecordCashPaymentDto) { return this.svc.recordCashPayment(id, req.user.schoolId!, { ...dto, receivedById: req.user.id }); }
  @UseGuards(AuthGuard("jwt"))
  @Post("invoices/:id/razorpay-order") razorpayOrder(@Param("id") id: string, @Req() req: Request & { user: RequestUser }) { return this.svc.createRazorpayOrder(id, req.user.schoolId!); }
  @Post("invoices/:id/verify-payment") verifyPayment(@Param("id") id: string, @Req() req: Request & { user: RequestUser }, @Body() dto: VerifyOnlinePaymentDto) { return this.svc.verifyOnlinePayment(id, req.user.schoolId!, { ...dto, receivedById: req.user.id }); }

  @Roles("ADMIN", "SUPER_ADMIN", "ACCOUNTANT", "PRINCIPAL")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Post("invoices/:id/concession") applyConcession(@Param("id") id: string, @Req() req: Request & { user: RequestUser }, @Body() dto: ApplyConcessionDto) { return this.svc.applyConcession({ ...dto, invoiceId: id, approvedById: req.user.id, schoolId: req.user.schoolId! }); }

  @Get("health") health() { return { status: "ok", service: "fee-service" }; }
}
