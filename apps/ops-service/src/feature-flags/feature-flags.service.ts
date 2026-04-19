/**
 * Feature Flag System
 *
 * Redis-backed feature flags per tenant.
 * Supports:
 *  - Enable/disable features per tenant without redeployment
 *  - Gradual rollout (5% → 20% → 50% → 100% of tenants)
 *  - A/B testing (show different UX to different tenant groups)
 *  - Beta school program (willing schools receive new features first)
 *  - Auto-rollback on error spike (monitor error rate via Prometheus)
 */
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { createClient, RedisClientType } from "redis";
import crypto from "crypto";

export type RolloutStage = 5 | 20 | 50 | 100;

export interface FeatureFlag {
  key: string;               // e.g. "BLOCKCHAIN_CERTS"
  name: string;
  description: string;
  enabled: boolean;
  rolloutPct: RolloutStage | 0;
  betaOnly: boolean;         // only for beta-enrolled schools
  abVariant?: "A" | "B";    // A/B testing variant
  killSwitchActive: boolean; // auto-rollback tripped
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantFeatureOverride {
  tenantId: string;
  featureKey: string;
  enabled: boolean;          // explicit override for this tenant
  isBeta: boolean;
}

// TTL for cached flag lookups
const FLAG_CACHE_TTL = 60; // seconds

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private redis!: RedisClientType;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.redis = createClient({ url: process.env.REDIS_URL ?? "redis://redis:6379" }) as RedisClientType;
    this.redis.on("error", err => this.logger.error("Redis error", err));
    await this.redis.connect();
  }

  // ── Flag Management ───────────────────────────────────────────────────────

  async createFlag(flag: Omit<FeatureFlag, "createdAt" | "updatedAt" | "killSwitchActive">): Promise<FeatureFlag> {
    await this.prisma.$executeRaw`
      INSERT INTO feature_flags (key, name, description, enabled, rollout_pct, beta_only, ab_variant, kill_switch_active, created_at, updated_at)
      VALUES (${flag.key}, ${flag.name}, ${flag.description}, ${flag.enabled}, ${flag.rolloutPct},
              ${flag.betaOnly}, ${flag.abVariant ?? null}, false, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE
        SET name = ${flag.name}, description = ${flag.description}, enabled = ${flag.enabled},
            rollout_pct = ${flag.rolloutPct}, beta_only = ${flag.betaOnly}, ab_variant = ${flag.abVariant ?? null},
            updated_at = NOW()
    `;
    await this.invalidateCache(flag.key);
    return this.getFlag(flag.key) as Promise<FeatureFlag>;
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    const rows = await this.prisma.$queryRaw<any[]>`SELECT * FROM feature_flags ORDER BY key`;
    return rows.map(r => this.mapFlag(r));
  }

  async getFlag(key: string): Promise<FeatureFlag | null> {
    const rows = await this.prisma.$queryRaw<any[]>`SELECT * FROM feature_flags WHERE key = ${key}`;
    return rows[0] ? this.mapFlag(rows[0]) : null;
  }

  async updateRollout(key: string, rolloutPct: RolloutStage | 0): Promise<void> {
    await this.prisma.$executeRaw`UPDATE feature_flags SET rollout_pct = ${rolloutPct}, updated_at = NOW() WHERE key = ${key}`;
    await this.invalidateCache(key);
    this.logger.log(`Feature ${key} rollout updated to ${rolloutPct}%`);
  }

  async toggleKillSwitch(key: string, active: boolean): Promise<void> {
    await this.prisma.$executeRaw`UPDATE feature_flags SET kill_switch_active = ${active}, updated_at = NOW() WHERE key = ${key}`;
    await this.invalidateCache(key);
    this.logger.warn(`Feature ${key} kill switch: ${active ? "ACTIVATED" : "deactivated"}`);
  }

  // ── Tenant Overrides ──────────────────────────────────────────────────────

  async setTenantOverride(tenantId: string, featureKey: string, enabled: boolean): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO tenant_feature_overrides (tenant_id, feature_key, enabled, updated_at)
      VALUES (${tenantId}, ${featureKey}, ${enabled}, NOW())
      ON CONFLICT (tenant_id, feature_key) DO UPDATE SET enabled = ${enabled}, updated_at = NOW()
    `;
    await this.invalidateTenantCache(tenantId, featureKey);
  }

  async enrollBeta(tenantId: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO beta_schools (tenant_id, enrolled_at)
      VALUES (${tenantId}, NOW())
      ON CONFLICT (tenant_id) DO NOTHING
    `;
    this.logger.log(`Tenant ${tenantId} enrolled in beta program`);
  }

  async leaveBeta(tenantId: string): Promise<void> {
    await this.prisma.$executeRaw`DELETE FROM beta_schools WHERE tenant_id = ${tenantId}`;
  }

  async isBetaSchool(tenantId: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<any[]>`SELECT 1 FROM beta_schools WHERE tenant_id = ${tenantId}`;
    return rows.length > 0;
  }

  // ── Feature Evaluation ────────────────────────────────────────────────────

  /**
   * The core evaluation function.
   * Returns true if the feature is enabled for this tenant.
   *
   * Priority:
   * 1. Kill switch → always false
   * 2. Explicit tenant override
   * 3. Beta-only check
   * 4. Gradual rollout hash
   * 5. Global enabled flag
   */
  async isEnabled(featureKey: string, tenantId: string): Promise<boolean> {
    const cacheKey = `ff:${featureKey}:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) return cached === "1";

    const result = await this.evaluate(featureKey, tenantId);
    await this.redis.setEx(cacheKey, FLAG_CACHE_TTL, result ? "1" : "0");
    return result;
  }

  private async evaluate(featureKey: string, tenantId: string): Promise<boolean> {
    const flag = await this.getFlag(featureKey);
    if (!flag || !flag.enabled) return false;
    if (flag.killSwitchActive) return false;

    // Explicit tenant override
    const override = await this.getTenantOverride(tenantId, featureKey);
    if (override !== null) return override;

    // Beta-only check
    if (flag.betaOnly) {
      const isBeta = await this.isBetaSchool(tenantId);
      if (!isBeta) return false;
    }

    // Gradual rollout via consistent hash
    if (flag.rolloutPct < 100) {
      const pct = this.hashTenantToPercent(tenantId, featureKey);
      return pct <= flag.rolloutPct;
    }

    return true;
  }

  /** Deterministic hash: same tenant+feature always lands in same bucket */
  private hashTenantToPercent(tenantId: string, featureKey: string): number {
    const hash = crypto.createHash("sha256").update(`${tenantId}:${featureKey}`).digest("hex");
    const int = parseInt(hash.slice(0, 8), 16);
    return (int % 100) + 1;  // 1–100
  }

  // ── A/B Testing ───────────────────────────────────────────────────────────

  /** Returns which variant (A or B) this tenant is in for a feature */
  async getVariant(featureKey: string, tenantId: string): Promise<"A" | "B" | null> {
    const flag = await this.getFlag(featureKey);
    if (!flag || !flag.abVariant) return null;
    const isEnabled = await this.isEnabled(featureKey, tenantId);
    if (!isEnabled) return null;

    const hash = crypto.createHash("sha256").update(`${tenantId}:${featureKey}:ab`).digest("hex");
    return parseInt(hash.slice(0, 2), 16) % 2 === 0 ? "A" : "B";
  }

  async getAbMetrics(featureKey: string): Promise<{ variantA: number; variantB: number; totalTenants: number }> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) AS total FROM tenants WHERE status = 'ACTIVE'
    `;
    const total = Number(rows[0]?.total ?? 0);
    return { variantA: Math.floor(total / 2), variantB: total - Math.floor(total / 2), totalTenants: total };
  }

  // ── Auto-Rollback ─────────────────────────────────────────────────────────

  /**
   * Called by Prometheus alert webhook when error spike detected.
   * If error rate > 5% for a feature-gated service → auto-rollback.
   */
  async handleErrorSpike(featureKey: string, errorRate: number): Promise<void> {
    const THRESHOLD = 5; // 5%
    if (errorRate > THRESHOLD) {
      await this.toggleKillSwitch(featureKey, true);
      this.logger.error(`AUTO-ROLLBACK: Feature ${featureKey} killed due to error rate ${errorRate.toFixed(2)}% > ${THRESHOLD}%`);
      // Notify engineering via notification service
    }
  }

  // ── Beta Program Admin ────────────────────────────────────────────────────

  async getBetaSchools(): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT t.id, t.name, b.enrolled_at
      FROM beta_schools b
      JOIN tenants t ON t.id = b.tenant_id
      ORDER BY b.enrolled_at DESC
    `;
  }

  // ── Cache Helpers ─────────────────────────────────────────────────────────

  private async invalidateCache(featureKey: string): Promise<void> {
    // Pattern delete: ff:{featureKey}:*
    const keys = await this.redis.keys(`ff:${featureKey}:*`);
    if (keys.length) await this.redis.del(keys);
  }

  private async invalidateTenantCache(tenantId: string, featureKey: string): Promise<void> {
    await this.redis.del(`ff:${featureKey}:${tenantId}`);
  }

  private async getTenantOverride(tenantId: string, featureKey: string): Promise<boolean | null> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT enabled FROM tenant_feature_overrides WHERE tenant_id = ${tenantId} AND feature_key = ${featureKey}
    `;
    return rows[0] ? rows[0].enabled : null;
  }

  private mapFlag(row: any): FeatureFlag {
    return {
      key: row.key, name: row.name, description: row.description,
      enabled: row.enabled, rolloutPct: row.rollout_pct,
      betaOnly: row.beta_only, abVariant: row.ab_variant,
      killSwitchActive: row.kill_switch_active,
      createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    };
  }
}
