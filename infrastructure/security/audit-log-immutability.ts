/**
 * Audit Log Immutability — HMAC-signed append-only audit chain.
 *
 * Each audit log entry includes:
 *  - HMAC-SHA256 of (previous_hash + entry_data) using server secret
 *  - This creates a tamper-evident chain — any modification invalidates all subsequent hashes
 *
 * Verification: scan all entries in order, recompute HMAC chain, flag any break.
 */
import crypto from "crypto";

const AUDIT_SECRET = process.env.AUDIT_HMAC_SECRET ?? "change_this_in_production";

export function computeEntryHmac(prevHash: string, entryData: string): string {
  return crypto
    .createHmac("sha256", AUDIT_SECRET)
    .update(prevHash + entryData)
    .digest("hex");
}

export function serializeEntry(entry: Record<string, unknown>): string {
  // Sort keys for deterministic serialization
  return JSON.stringify(entry, Object.keys(entry).sort());
}

/**
 * Append a new audit log entry.
 * Called via DB trigger or service layer — never called directly by API handlers.
 */
export async function appendAuditLog(
  prisma: any,
  entry: {
    tenantId: string;
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    payload?: Record<string, unknown>;
    ip: string;
  }
): Promise<void> {
  // Get previous hash
  const prev = await prisma.$queryRaw<any[]>`
    SELECT hmac_hash FROM audit_logs
    WHERE tenant_id = ${entry.tenantId}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const prevHash = prev[0]?.hmac_hash ?? "GENESIS";

  const entryData = serializeEntry({
    ...entry,
    createdAt: new Date().toISOString(),
  });
  const hmac = computeEntryHmac(prevHash, entryData);

  await prisma.$executeRaw`
    INSERT INTO audit_logs (
      tenant_id, user_id, action, resource, resource_id,
      payload, ip, hmac_hash, prev_hash, created_at
    ) VALUES (
      ${entry.tenantId}, ${entry.userId}, ${entry.action},
      ${entry.resource}, ${entry.resourceId},
      ${JSON.stringify(entry.payload ?? {})}::jsonb,
      ${entry.ip}, ${hmac}, ${prevHash}, NOW()
    )
  `;
}

/**
 * Verify integrity of entire audit chain for a tenant.
 * Returns list of tampered entries (should be empty in normal operation).
 */
export async function verifyAuditChain(prisma: any, tenantId: string): Promise<string[]> {
  const entries = await prisma.$queryRaw<any[]>`
    SELECT * FROM audit_logs
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at ASC
  `;

  const tampered: string[] = [];
  let expectedPrevHash = "GENESIS";

  for (const entry of entries) {
    const entryData = serializeEntry({
      tenantId: entry.tenant_id,
      userId: entry.user_id,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resource_id,
      payload: entry.payload,
      ip: entry.ip,
      createdAt: entry.created_at.toISOString(),
    });
    const expectedHmac = computeEntryHmac(expectedPrevHash, entryData);

    if (entry.hmac_hash !== expectedHmac || entry.prev_hash !== expectedPrevHash) {
      tampered.push(`Entry ${entry.id} (${entry.action} at ${entry.created_at}) — TAMPERED`);
    }
    expectedPrevHash = entry.hmac_hash;
  }
  return tampered;
}
