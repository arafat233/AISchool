/**
 * Webhook Dispatcher
 *
 * Events fired by internal services reach this webhook service.
 * It dispatches POST requests to all registered endpoints for the school.
 *
 * Supported events: student_enrolled, fee_paid, result_published,
 * attendance_marked, staff_joined, exam_scheduled, certificate_issued
 *
 * Delivery: max 3 attempts, exponential backoff (5s → 25s → 125s)
 * Logs every attempt in webhook_delivery_logs.
 */
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import axios from "axios";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "crypto";

const WEBHOOK_KEY = Buffer.from(process.env.WEBHOOK_ENCRYPTION_KEY!, "hex"); // 32-byte hex key

function encryptSecret(val: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", WEBHOOK_KEY, iv);
  const enc = Buffer.concat([cipher.update(val, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

function decryptSecret(val: string): string {
  const [ivHex, tagHex, encHex] = val.split(":");
  const decipher = createDecipheriv("aes-256-gcm", WEBHOOK_KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]).toString("utf8");
}

export type WebhookEvent =
  | "student_enrolled"
  | "fee_paid"
  | "result_published"
  | "attendance_marked"
  | "staff_joined"
  | "exam_scheduled"
  | "certificate_issued";

const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 5000;

@Injectable()
export class WebhookService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Registration ──────────────────────────────────────────────────────────

  async registerEndpoint(schoolId: string, url: string, events: WebhookEvent[], secret: string) {
    const secretEnc = encryptSecret(secret);
    await this.prisma.$executeRaw`
      INSERT INTO webhook_endpoints (school_id, url, events, secret_hash, is_active, created_at)
      VALUES (${schoolId}, ${url}, ${JSON.stringify(events)}::jsonb, ${secretEnc}, true, NOW())
    `;
  }

  async listEndpoints(schoolId: string) {
    return this.prisma.$queryRaw<any[]>`
      SELECT id, url, events, is_active, created_at, last_delivery_at, delivery_success_count, delivery_fail_count
      FROM webhook_endpoints
      WHERE school_id = ${schoolId}
      ORDER BY created_at DESC
    `;
  }

  async deactivateEndpoint(endpointId: string, schoolId: string) {
    await this.prisma.$executeRaw`
      UPDATE webhook_endpoints SET is_active = false
      WHERE id = ${endpointId} AND school_id = ${schoolId}
    `;
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────

  /**
   * Called by internal services when an event occurs.
   * Finds all active subscribed endpoints and dispatches asynchronously.
   */
  async dispatch(schoolId: string, event: WebhookEvent, payload: Record<string, unknown>) {
    const endpoints = await this.prisma.$queryRaw<any[]>`
      SELECT id, url, secret_hash
      FROM webhook_endpoints
      WHERE school_id = ${schoolId}
        AND is_active = true
        AND events @> ${JSON.stringify([event])}::jsonb
    `;

    for (const ep of endpoints) {
      this.deliverWithRetry(ep, event, payload, 1).catch(() => {});
    }
  }

  private async deliverWithRetry(
    endpoint: { id: string; url: string; secret_hash: string },
    event: WebhookEvent,
    payload: Record<string, unknown>,
    attempt: number
  ): Promise<void> {
    const body = JSON.stringify({
      event,
      payload,
      timestamp: new Date().toISOString(),
      attempt,
    });

    // Decrypt stored secret and use raw value as HMAC key
    const rawSecret = decryptSecret(endpoint.secret_hash);
    const signature = crypto
      .createHmac("sha256", rawSecret)
      .update(body)
      .digest("hex");

    let statusCode: number | null = null;
    let success = false;
    let errorMessage: string | null = null;

    try {
      const res = await axios.post(endpoint.url, body, {
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": event,
          "X-Webhook-Signature": `sha256=${signature}`,
          "X-Webhook-Attempt": String(attempt),
        },
        timeout: 10000,
      });
      statusCode = res.status;
      success = res.status >= 200 && res.status < 300;
    } catch (err: any) {
      statusCode = err?.response?.status ?? null;
      errorMessage = err.message;
    }

    // Log delivery
    await this.logDelivery(endpoint.id, event, attempt, success, statusCode, errorMessage);

    // Update endpoint stats
    if (success) {
      await this.prisma.$executeRaw`
        UPDATE webhook_endpoints
        SET last_delivery_at = NOW(),
            delivery_success_count = delivery_success_count + 1
        WHERE id = ${endpoint.id}
      `;
    } else {
      await this.prisma.$executeRaw`
        UPDATE webhook_endpoints
        SET delivery_fail_count = delivery_fail_count + 1
        WHERE id = ${endpoint.id}
      `;
    }

    // Retry with exponential backoff
    if (!success && attempt < MAX_ATTEMPTS) {
      const delay = BACKOFF_BASE_MS * Math.pow(5, attempt - 1);
      setTimeout(
        () => this.deliverWithRetry(endpoint, event, payload, attempt + 1).catch(() => {}),
        delay
      );
    }
  }

  private async logDelivery(
    endpointId: string,
    event: string,
    attempt: number,
    success: boolean,
    statusCode: number | null,
    error: string | null
  ) {
    await this.prisma.$executeRaw`
      INSERT INTO webhook_delivery_logs
        (endpoint_id, event, attempt, success, status_code, error_message, attempted_at)
      VALUES
        (${endpointId}, ${event}, ${attempt}, ${success}, ${statusCode}, ${error}, NOW())
    `;
  }

  // ── Delivery Log ──────────────────────────────────────────────────────────

  async getDeliveryLog(schoolId: string, endpointId?: string) {
    const epFilter = endpointId ? Prisma.sql`AND wdl.endpoint_id = ${endpointId}` : Prisma.empty;
    return this.prisma.$queryRaw<any[]>`
      SELECT
        wdl.endpoint_id,
        we.url,
        wdl.event,
        wdl.attempt,
        wdl.success,
        wdl.status_code,
        wdl.error_message,
        wdl.attempted_at
      FROM webhook_delivery_logs wdl
      JOIN webhook_endpoints we ON we.id = wdl.endpoint_id
      WHERE we.school_id = ${schoolId}
        ${epFilter}
      ORDER BY wdl.attempted_at DESC
      LIMIT 100
    `;
  }
}
