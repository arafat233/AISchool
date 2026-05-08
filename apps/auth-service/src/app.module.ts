import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { PrismaModule } from "@school-erp/database";

import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health/health.controller";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TenantScopeInterceptor } from "./interceptors/tenant-scope.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const isProd = process.env.NODE_ENV === 'production';
        return [
          { name: 'burst',  ttl: 1_000,     limit: isProd ? 3   : 30  },
          { name: 'minute', ttl: 60_000,    limit: isProd ? 20  : 120 },
          { name: 'hour',   ttl: 3_600_000, limit: isProd ? 100 : 600 },
        ];
      },
    }),

    PrismaModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantScopeInterceptor },
  ],
})
export class AppModule {}
