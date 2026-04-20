import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { PrismaModule } from "@school-erp/database";

import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ThrottlerModule.forRoot([
      { name: "burst",  ttl: 1_000,    limit: 3   }, // 3 req/s  — burst protection
      { name: "minute", ttl: 60_000,   limit: 20  }, // 20 req/min
      { name: "hour",   ttl: 3600_000, limit: 100 }, // 100 req/hr — brute-force ceiling
    ]),

    PrismaModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
