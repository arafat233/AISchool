import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { BillingService } from "./billing/billing.service";

@Controller("saas")
@UseGuards(AuthGuard("jwt"))
export class SaasMetricsController {
  constructor(private readonly billing: BillingService) {}

  @Get("metrics")
  metrics() { return this.billing.getSaasMetrics(); }
}
