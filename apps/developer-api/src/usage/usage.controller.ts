/**
 * API Usage Dashboard
 * GET /v1/usage/today       — requests today, error rate, top endpoints
 * GET /v1/usage/monthly     — monthly breakdown with plan limits
 * GET /v1/usage/rate-limit  — current rate-limit status for the calling key
 */
import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { ApiKeyGuard, ApiKeyContext } from "../auth/api-key.guard";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("Usage")
@ApiSecurity("ApiKeyAuth")
@Controller("usage")
@UseGuards(ApiKeyGuard)
export class UsageController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("today")
  async today(@Req() req: any) {
    const ctx: ApiKeyContext = req.apiKeyContext;
    return this.prisma.$queryRaw`
      SELECT
        COUNT(*) AS total_requests,
        COUNT(*) FILTER (WHERE status_code >= 400) AS error_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status_code >= 400) / NULLIF(COUNT(*), 0), 1) AS error_rate_pct,
        AVG(response_ms) AS avg_latency_ms,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_ms) AS p50_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_ms) AS p95_ms
      FROM api_usage_logs
      WHERE api_key_id = ${ctx.apiKeyId}
        AND requested_at >= NOW()::DATE
    `;
  }

  @Get("monthly")
  async monthly(@Req() req: any) {
    const ctx: ApiKeyContext = req.apiKeyContext;
    const MONTHLY_LIMITS: Record<string, number> = {
      BASIC: 50_000, STANDARD: 250_000, PREMIUM: 1_000_000, ENTERPRISE: 999_999_999,
    };
    const limit = MONTHLY_LIMITS[ctx.plan] ?? 50_000;

    const usage = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) AS requests_this_month
      FROM api_usage_logs
      WHERE api_key_id = ${ctx.apiKeyId}
        AND requested_at >= DATE_TRUNC('month', NOW())
    `;

    const used = Number(usage[0]?.requests_this_month ?? 0);
    return {
      plan: ctx.plan,
      monthlyLimit: limit,
      usedThisMonth: used,
      remainingThisMonth: Math.max(0, limit - used),
      usagePercent: limit > 0 ? Math.round((used / limit) * 100) : 0,
    };
  }

  @Get("rate-limit")
  async rateLimit(@Req() req: any) {
    const ctx: ApiKeyContext = req.apiKeyContext;
    // Returns current rate limit tier for the calling key
    return {
      plan: ctx.plan,
      requestsPerMinute: ctx.rateLimit,
      isSandbox: ctx.isSandbox,
      note: ctx.isSandbox
        ? "Sandbox mode — no real data is modified. Rate limits are relaxed."
        : "Production mode.",
    };
  }
}
