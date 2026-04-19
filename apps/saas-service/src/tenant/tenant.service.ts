import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { CreateTenantDto, UpdateTenantDto, ChangePlanDto, UpdateStatusDto, SubscriptionPlan } from "./tenant.dto";
import { v4 as uuidv4 } from "uuid";

// Plan pricing: per student per month (Rs)
const PLAN_PRICING: Record<string, number> = {
  BASIC: 50,
  STANDARD: 100,
  PREMIUM: 150,
  ENTERPRISE: 200,
};

// Feature flags per plan
const PLAN_FEATURES: Record<string, string[]> = {
  BASIC: ["attendance", "fee", "student", "academic", "notification"],
  STANDARD: ["attendance", "fee", "student", "academic", "notification", "lms", "exam", "hr", "payroll", "transport"],
  PREMIUM: ["attendance", "fee", "student", "academic", "notification", "lms", "exam", "hr", "payroll", "transport", "library", "health", "event", "expense", "scholarship", "certificate"],
  ENTERPRISE: ["*"], // all features
};

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async createTenant(dto: CreateTenantDto) {
    const tenant = await this.prisma.tenant.create({
      data: {
        id: uuidv4(),
        name: dto.name,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        city: dto.city,
        state: dto.state,
        plan: dto.plan ?? SubscriptionPlan.BASIC,
        status: "TRIAL",
        trialEndsAt: new Date(Date.now() + 30 * 86_400_000), // 30-day trial
        featureFlags: PLAN_FEATURES[dto.plan ?? SubscriptionPlan.BASIC],
      },
    });
    return tenant;
  }

  async listTenants(status?: string) {
    const where = status ? { status: status as any } : {};
    const tenants = await this.prisma.tenant.findMany({
      where,
      include: { _count: { select: { schools: true } } },
      orderBy: { createdAt: "desc" },
    });
    return tenants.map((t) => ({
      ...t,
      subscriptionPlan: t.plan,
      subscriptionStatus: t.status,
      schoolCount: t._count.schools,
    }));
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    await this.getTenant(id);
    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.contactEmail) data.contactEmail = dto.contactEmail;
    if (dto.plan) { data.plan = dto.plan; data.featureFlags = PLAN_FEATURES[dto.plan]; }
    if (dto.status) data.status = dto.status;
    return this.prisma.tenant.update({ where: { id }, data });
  }

  async changePlan(id: string, dto: ChangePlanDto) {
    await this.getTenant(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { plan: dto.plan, featureFlags: PLAN_FEATURES[dto.plan] },
    });
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    await this.getTenant(id);
    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === "CHURNED" ? { churnedAt: new Date(), churnReason: dto.reason } : {}),
        ...(dto.status === "ACTIVE" ? { activatedAt: new Date() } : {}),
      },
    });
  }

  async activateTenant(id: string) {
    return this.updateStatus(id, { status: "ACTIVE" as any });
  }

  async suspendTenant(id: string, reason?: string) {
    return this.updateStatus(id, { status: "SUSPENDED" as any, reason });
  }

  async getSummary() {
    const [total, active, trial, suspended, churned] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: "ACTIVE" } }),
      this.prisma.tenant.count({ where: { status: "TRIAL" } }),
      this.prisma.tenant.count({ where: { status: "SUSPENDED" } }),
      this.prisma.tenant.count({ where: { status: "CHURNED" } }),
    ]);

    // Aggregate student & staff counts from tenant schools
    const schools = await this.prisma.school.findMany({ select: { tenantId: true, _count: { select: { students: true, staff: true } } } });
    const totalStudents = schools.reduce((s, sc) => s + sc._count.students, 0);
    const totalStaff = schools.reduce((s, sc) => s + sc._count.staff, 0);

    return { totalSchools: active + trial, total, active, trial, suspended, churned, totalStudents, totalStaff };
  }

  async getPlanPricing() {
    return Object.entries(PLAN_PRICING).map(([plan, pricePerStudent]) => ({
      plan,
      pricePerStudent,
      features: PLAN_FEATURES[plan],
    }));
  }
}
