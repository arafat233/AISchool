import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";

/**
 * Customer health score = weighted composite of:
 *   - Login frequency (30d logins / 30) × 30 pts
 *   - Feature adoption (modules used / total modules) × 20 pts
 *   - Support ticket load (fewer open tickets = better) × 15 pts
 *   - NPS score (0–10 → 0–15 pts)
 *   - Payment timeliness (paid on time ratio × 20 pts)
 *
 * Total: 100 pts
 */
const WEIGHTS = { login: 30, featureAdoption: 20, support: 15, nps: 15, paymentTimeliness: 20 };

@Injectable()
export class HealthScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async computeForTenant(tenantId: string): Promise<{ tenantId: string; score: number; breakdown: Record<string, number> }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return { tenantId, score: 0, breakdown: {} };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

    // [1] Login frequency
    const loginCount = await this.prisma.auditLog.count({
      where: { tenantId, action: "LOGIN", createdAt: { gte: thirtyDaysAgo } },
    });
    const loginScore = Math.min(1, loginCount / 30) * WEIGHTS.login;

    // [2] Feature adoption: how many distinct resources were accessed
    const distinctResources = await this.prisma.auditLog.findMany({
      where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
      distinct: ["resource"],
      select: { resource: true },
    });
    const featureFlags = Array.isArray(tenant.featureFlags) ? tenant.featureFlags : [];
    const totalModules = featureFlags.includes("*") ? 20 : featureFlags.length;
    const adoptionScore = totalModules > 0 ? Math.min(1, distinctResources.length / totalModules) * WEIGHTS.featureAdoption : WEIGHTS.featureAdoption;

    // [3] Support ticket load — fewer open tickets = better
    const openTickets = await this.prisma.supportTicket.count({
      where: { tenantId, status: { in: ["OPEN", "IN_PROGRESS"] } },
    });
    const supportScore = Math.max(0, WEIGHTS.support - openTickets * 3);

    // [4] NPS (latest survey response)
    const latestNps = await this.prisma.npsResponse.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    const npsScore = latestNps ? (latestNps.score / 10) * WEIGHTS.nps : WEIGHTS.nps * 0.5;

    // [5] Payment timeliness
    const invoices = await this.prisma.saasInvoice.findMany({ where: { tenantId, status: "PAID" }, select: { dueDate: true, paidAt: true } });
    const onTime = invoices.filter((i) => i.paidAt && i.dueDate && i.paidAt <= i.dueDate).length;
    const paymentScore = invoices.length > 0 ? (onTime / invoices.length) * WEIGHTS.paymentTimeliness : WEIGHTS.paymentTimeliness;

    const breakdown = {
      login: Math.round(loginScore),
      featureAdoption: Math.round(adoptionScore),
      support: Math.round(supportScore),
      nps: Math.round(npsScore),
      paymentTimeliness: Math.round(paymentScore),
    };
    const score = Math.min(100, Object.values(breakdown).reduce((s, v) => s + v, 0));

    // Persist
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { healthScore: score } });

    return { tenantId, score, breakdown };
  }

  async computeAll() {
    const tenants = await this.prisma.tenant.findMany({ where: { status: { in: ["ACTIVE", "TRIAL"] as any[] } }, select: { id: true } });
    return Promise.all(tenants.map((t) => this.computeForTenant(t.id)));
  }

  async submitNps(tenantId: string, score: number, feedback?: string) {
    return this.prisma.npsResponse.create({ data: { tenantId, score, feedback } });
  }
}
