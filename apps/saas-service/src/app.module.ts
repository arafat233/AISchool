import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "@school-erp/database";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./guards/jwt.strategy";

import { TenantController } from "./tenant/tenant.controller";
import { TenantService } from "./tenant/tenant.service";

import { BillingController } from "./billing/billing.controller";
import { BillingService } from "./billing/billing.service";

import { HealthScoreController } from "./health-score/health-score.controller";
import { HealthScoreService } from "./health-score/health-score.service";

import { SupportController } from "./support/support.controller";
import { SupportService } from "./support/support.service";

import { OnboardingController } from "./onboarding/onboarding.controller";
import { OnboardingService } from "./onboarding/onboarding.service";

import { ApiKeyController } from "./apikey/apikey.controller";
import { ApiKeyService } from "./apikey/apikey.service";

import { AuditController } from "./audit.controller";
import { SaasMetricsController } from "./saas-metrics.controller";
import { SaasNotificationService } from "./notification/saas-notification.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PassportModule,
    ThrottlerModule.forRoot([
      { name: "burst",  ttl: 1_000,    limit: 10  },
      { name: "minute", ttl: 60_000,   limit: 60  },
      { name: "hour",   ttl: 3600_000, limit: 300 },
    ]),
  ],
  controllers: [
    TenantController,
    BillingController,
    HealthScoreController,
    SupportController,
    OnboardingController,
    ApiKeyController,
    AuditController,
    SaasMetricsController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    JwtStrategy,
    SaasNotificationService,
    TenantService,
    BillingService,
    HealthScoreService,
    SupportService,
    OnboardingService,
    ApiKeyService,
  ],
})
export class AppModule {}
