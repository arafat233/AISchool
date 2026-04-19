import { Controller, Get, Post, Param, Query, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { BillingService } from "./billing.service";
import { IsIn, IsString } from "class-validator";

class RecordPaymentDto {
  @IsIn(["NACH", "UPI", "BANK_TRANSFER"]) method: "NACH" | "UPI" | "BANK_TRANSFER";
  @IsString() txnRef: string;
}

@Controller("billing")
@UseGuards(AuthGuard("jwt"))
export class BillingController {
  constructor(private readonly svc: BillingService) {}

  @Post("invoice/:tenantId/:year/:month")
  generate(@Param("tenantId") tenantId: string, @Param("month") month: string, @Param("year") year: string) {
    return this.svc.generateMonthlyInvoice(tenantId, Number(month), Number(year));
  }

  @Get("invoices")
  list(@Query("tenantId") tenantId?: string, @Query("status") status?: string) {
    return this.svc.listInvoices(tenantId, status);
  }

  @Post("invoices/:id/pay")
  pay(@Param("id") id: string, @Body() dto: RecordPaymentDto) {
    return this.svc.recordPayment(id, dto.method, dto.txnRef);
  }

  @Get("revenue/mtd")
  revenueMtd() { return this.svc.getRevenueMtd(); }

  @Get("revenue/monthly")
  monthly() { return this.svc.getMonthlyRevenue(); }

  @Get("plan-breakdown")
  planBreakdown() { return this.svc.getPlanBreakdown(); }

  @Get("preview/:tenantId")
  preview(@Param("tenantId") tenantId: string, @Query("annual") annual?: string) {
    return this.svc.computeBillPreview(tenantId, annual === "true");
  }
}
