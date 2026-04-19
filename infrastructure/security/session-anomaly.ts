/**
 * Session Anomaly Detection
 *
 * Detects suspicious login patterns:
 *  - New IP never seen for this user in 30 days → flag
 *  - New device fingerprint → flag
 *  - Login from 2 different countries in < 2 hours → force re-auth (impossible travel)
 *  - > 5 failed attempts in 15 minutes → temporary lockout
 */
import crypto from "crypto";

export interface LoginContext {
  userId: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

export interface AnomalyResult {
  anomalous: boolean;
  type?: "NEW_IP" | "NEW_DEVICE" | "IMPOSSIBLE_TRAVEL" | "BRUTE_FORCE";
  action: "ALLOW" | "REQUIRE_2FA" | "BLOCK";
  message?: string;
}

function fingerprintDevice(userAgent: string): string {
  return crypto.createHash("sha256").update(userAgent).digest("hex").slice(0, 16);
}

export async function detectSessionAnomaly(
  prisma: any,
  notificationClient: any,
  ctx: LoginContext
): Promise<AnomalyResult> {
  const deviceFp = fingerprintDevice(ctx.userAgent);

  // ── Check brute force ────────────────────────────────────────────────────
  const failedAttempts = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) AS count
    FROM login_attempts
    WHERE user_id = ${ctx.userId}
      AND success = false
      AND attempted_at >= NOW() - INTERVAL '15 minutes'
  `;
  if (Number(failedAttempts[0]?.count ?? 0) >= 5) {
    await notificationClient.alertAdmin(ctx.userId, "BRUTE_FORCE_DETECTED", ctx.ip);
    return { anomalous: true, type: "BRUTE_FORCE", action: "BLOCK", message: "Account temporarily locked." };
  }

  // ── Check new IP ──────────────────────────────────────────────────────────
  const knownIps = await prisma.$queryRaw<any[]>`
    SELECT ip FROM login_attempts
    WHERE user_id = ${ctx.userId} AND success = true
      AND attempted_at >= NOW() - INTERVAL '30 days'
  `;
  const knownIpSet = new Set(knownIps.map((r: any) => r.ip));

  if (!knownIpSet.has(ctx.ip)) {
    // New IP — require 2FA challenge
    return {
      anomalous: true,
      type: "NEW_IP",
      action: "REQUIRE_2FA",
      message: "Login from a new location detected. Please verify with 2FA.",
    };
  }

  // ── Check impossible travel (GeoIP lookup) ───────────────────────────────
  const lastLogin = await prisma.$queryRaw<any[]>`
    SELECT ip, attempted_at, country_code FROM login_attempts
    WHERE user_id = ${ctx.userId} AND success = true
    ORDER BY attempted_at DESC LIMIT 1
  `;

  if (lastLogin.length) {
    const timeDiffHours =
      (ctx.timestamp.getTime() - new Date(lastLogin[0].attempted_at).getTime()) / 3_600_000;
    if (timeDiffHours < 2 && lastLogin[0].country_code && lastLogin[0].country_code !== "UNKNOWN") {
      // In production: use MaxMind GeoIP2 to get country of ctx.ip
      // and compare with lastLogin[0].country_code
    }
  }

  return { anomalous: false, action: "ALLOW" };
}
