/**
 * 6-month deprecation notice process.
 *
 * When a breaking change is planned:
 *  1. Admin registers the deprecated endpoint + planned removal date
 *  2. All API keys that have called that endpoint in the last 30 days receive:
 *     - In-app notification (via notification-service)
 *     - Email notification to the developer email on file
 *  3. Subsequent API calls to deprecated endpoints return
 *     `Deprecation: true` and `Sunset: <ISO date>` headers
 *  4. 30-day reminder and 7-day final warning auto-sent
 */
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import axios from "axios";

export interface DeprecationNotice {
  endpointPattern: string;    // e.g. "GET /v1/students/:id/marks"
  reason: string;
  replacedBy?: string;        // new endpoint to use
  sunsetDate: Date;           // removal date (min 6 months from today)
}

@Injectable()
export class DeprecationService {
  constructor(private readonly prisma: PrismaService) {}

  async registerDeprecation(notice: DeprecationNotice): Promise<void> {
    // Enforce 6-month minimum notice
    const minDate = new Date();
    minDate.setMonth(minDate.getMonth() + 6);
    if (notice.sunsetDate < minDate) {
      throw new Error("Deprecation sunset date must be at least 6 months from today (regulatory requirement).");
    }

    await this.prisma.$executeRaw`
      INSERT INTO api_deprecation_notices
        (endpoint_pattern, reason, replaced_by, sunset_date, created_at)
      VALUES
        (${notice.endpointPattern}, ${notice.reason}, ${notice.replacedBy ?? null}, ${notice.sunsetDate}, NOW())
      ON CONFLICT (endpoint_pattern) DO UPDATE SET
        reason = EXCLUDED.reason,
        replaced_by = EXCLUDED.replaced_by,
        sunset_date = EXCLUDED.sunset_date
    `;

    await this.notifyAffectedDevelopers(notice);
  }

  /**
   * Called by the API gateway middleware on each request.
   * Returns deprecation info if the requested path matches any notice.
   */
  async getDeprecationHeaders(method: string, path: string): Promise<Record<string, string>> {
    const notices = await this.prisma.$queryRaw<any[]>`
      SELECT endpoint_pattern, sunset_date, replaced_by
      FROM api_deprecation_notices
      WHERE sunset_date > NOW()
    `;

    for (const n of notices) {
      // Simple prefix match — production would use path-to-regexp
      const pattern = n.endpoint_pattern.replace(/:[\w]+/g, "[^/]+");
      if (new RegExp(`^${pattern}$`).test(`${method} ${path}`)) {
        const headers: Record<string, string> = {
          Deprecation: "true",
          Sunset: new Date(n.sunset_date).toUTCString(),
        };
        if (n.replaced_by) {
          headers["Link"] = `<${n.replaced_by}>; rel="successor-version"`;
        }
        return headers;
      }
    }
    return {};
  }

  async listDeprecations() {
    return this.prisma.$queryRaw`
      SELECT endpoint_pattern, reason, replaced_by, sunset_date,
             EXTRACT(DAY FROM (sunset_date - NOW()))::INT AS days_remaining
      FROM api_deprecation_notices
      ORDER BY sunset_date ASC
    `;
  }

  private async notifyAffectedDevelopers(notice: DeprecationNotice): Promise<void> {
    // Find all API keys that have called this endpoint in the last 30 days
    const affected = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT ak.id, ak.school_id, t.contact_email
      FROM api_usage_logs aul
      JOIN api_keys ak ON ak.id = aul.api_key_id
      JOIN tenants t ON t.id = ak.tenant_id
      WHERE aul.path LIKE ${notice.endpointPattern.replace(/:[\w]+/g, "%")}
        AND aul.requested_at >= NOW() - INTERVAL '30 days'
    `;

    for (const dev of affected) {
      try {
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL ?? "http://notification-service:3007"}/internal/alert`, {
          type: "API_DEPRECATION_NOTICE",
          schoolId: dev.school_id,
          title: `API Deprecation Notice: ${notice.endpointPattern}`,
          body: `The endpoint "${notice.endpointPattern}" will be removed on ${notice.sunsetDate.toDateString()}. ${notice.replacedBy ? `Please migrate to: ${notice.replacedBy}` : "Please update your integration."} Reason: ${notice.reason}`,
          recipients: ["DEVELOPER"],
          severity: "MEDIUM",
          metadata: { sunsetDate: notice.sunsetDate, replacedBy: notice.replacedBy },
        });
      } catch {
        // Non-critical
      }
    }
  }
}
