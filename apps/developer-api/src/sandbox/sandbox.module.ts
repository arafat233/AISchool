/**
 * Sandbox Environment
 *
 * API keys prefixed with `sk_test_` route requests to an isolated sandbox tenant.
 * Sandbox tenant has pre-seeded sample data (students, classes, fees, attendance).
 * No real data is modified. Rate limits are relaxed to 1000/min.
 *
 * Auto-provisioned: when a school signs up, a test API key is created automatically.
 * Sandbox data reset: every Sunday at midnight via cron.
 */
import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SandboxService } from "./sandbox.service";

@Module({
  imports: [PrismaModule],
  providers: [SandboxService],
  exports: [SandboxService],
})
export class SandboxModule {}
