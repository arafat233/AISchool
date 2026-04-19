/**
 * API Key Authentication Guard
 *
 * Extracts `x-api-key` header, validates SHA-256 hash against DB,
 * checks school plan for rate limit tier, attaches tenant context to request.
 *
 * Sandbox: keys prefixed with `sk_test_` route to isolated test tenant.
 */
import {
  Injectable, CanActivate, ExecutionContext,
  UnauthorizedException, ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import crypto from "crypto";

export interface ApiKeyContext {
  apiKeyId: string;
  schoolId: string;
  tenantId: string;
  plan: string;
  isSandbox: boolean;
  rateLimit: number;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const rawKey = req.headers["x-api-key"] as string | undefined;

    if (!rawKey) {
      throw new UnauthorizedException("Missing x-api-key header");
    }

    const isSandbox = rawKey.startsWith("sk_test_");
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const keyRecord = await this.prisma.$queryRaw<any[]>`
      SELECT
        ak.id, ak.school_id, ak.tenant_id, ak.is_active, ak.expires_at,
        t.plan, t.status AS tenant_status
      FROM api_keys ak
      JOIN tenants t ON t.id = ak.tenant_id
      WHERE ak.key_hash = ${keyHash}
      LIMIT 1
    `;

    if (!keyRecord.length) {
      throw new UnauthorizedException("Invalid API key");
    }

    const key = keyRecord[0];

    if (!key.is_active) {
      throw new ForbiddenException("API key has been revoked");
    }

    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      throw new ForbiddenException("API key has expired");
    }

    if (key.tenant_status === "SUSPENDED") {
      throw new ForbiddenException("Tenant account is suspended");
    }

    const RATE_LIMITS: Record<string, number> = {
      BASIC: 100, STANDARD: 300, PREMIUM: 1000, ENTERPRISE: 3000,
    };

    req.apiKeyContext = {
      apiKeyId: key.id,
      schoolId: key.school_id,
      tenantId: key.tenant_id,
      plan: key.plan,
      isSandbox,
      rateLimit: RATE_LIMITS[key.plan] ?? 100,
    } as ApiKeyContext;

    // Record usage asynchronously (fire and forget)
    this.recordUsage(key.id, req.method, req.path, req.ip).catch(() => {});

    return true;
  }

  private async recordUsage(keyId: string, method: string, path: string, ip: string) {
    await this.prisma.$executeRaw`
      INSERT INTO api_usage_logs (api_key_id, method, path, ip, requested_at)
      VALUES (${keyId}, ${method}, ${path}, ${ip}, NOW())
    `;
  }
}
