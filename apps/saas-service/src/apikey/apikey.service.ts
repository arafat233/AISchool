import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { v4 as uuidv4 } from "uuid";
import * as crypto from "crypto";

// Rate limits per plan (requests per minute)
const RATE_LIMITS: Record<string, number> = {
  BASIC: 30,
  STANDARD: 100,
  PREMIUM: 300,
  ENTERPRISE: 1000,
};

function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `sk_live_${uuidv4().replace(/-/g, "")}`;
  const prefix = raw.slice(0, 12); // "sk_live_XXXX"
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, prefix, hash };
}

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async issueKey(tenantId: string, label: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);

    const { raw, prefix, hash } = generateApiKey();
    const rateLimit = RATE_LIMITS[tenant.plan] ?? RATE_LIMITS["BASIC"];

    await this.prisma.apiKey.create({
      data: { tenantId, label, keyPrefix: prefix, keyHash: hash, rateLimit, isActive: true },
    });

    // Return raw key once — never stored again
    return { raw, prefix, label, rateLimit, warning: "Store this key securely — it will not be shown again." };
  }

  async listKeys(tenantId: string) {
    return this.prisma.apiKey.findMany({
      where: { tenantId },
      select: { id: true, label: true, keyPrefix: true, rateLimit: true, isActive: true, lastUsedAt: true, requestCount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeKey(id: string, tenantId: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException(`API key ${id} not found`);
    if (key.tenantId !== tenantId) throw new ForbiddenException();
    return this.prisma.apiKey.update({ where: { id }, data: { isActive: false, revokedAt: new Date() } });
  }

  async recordUsage(keyId: string) {
    return this.prisma.apiKey.update({
      where: { id: keyId },
      data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
    });
  }

  async getUsageDashboard(tenantId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { tenantId },
      select: { id: true, label: true, keyPrefix: true, rateLimit: true, requestCount: true, lastUsedAt: true, isActive: true },
    });
    const totalRequests = keys.reduce((s, k) => s + (k.requestCount ?? 0), 0);
    return { keys, totalRequests };
  }
}
