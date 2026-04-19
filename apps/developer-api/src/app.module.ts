import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { WebhookController } from "./webhooks/webhook.controller";
import { WebhookService } from "./webhooks/webhook.service";
import { UsageController } from "./usage/usage.controller";
import { PublicApiController } from "./public-api/public-api.controller";
import { SandboxModule } from "./sandbox/sandbox.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SandboxModule,
    ThrottlerModule.forRoot([
      { name: "BASIC",      ttl: 60_000, limit: 100  },
      { name: "STANDARD",   ttl: 60_000, limit: 300  },
      { name: "PREMIUM",    ttl: 60_000, limit: 1000 },
      { name: "ENTERPRISE", ttl: 60_000, limit: 3000 },
    ]),
  ],
  controllers: [WebhookController, UsageController, PublicApiController],
  providers: [
    WebhookService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
