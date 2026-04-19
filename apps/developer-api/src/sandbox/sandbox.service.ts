/**
 * Sandbox tenant management.
 * Seeds test data for new schools on sign-up.
 * Weekly reset via cron.
 */
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import schedule from "node-schedule";

@Injectable()
export class SandboxService {
  constructor(private readonly prisma: PrismaService) {
    // Reset all sandbox tenants every Sunday at midnight
    schedule.scheduleJob("0 0 * * 0", () => this.resetAllSandboxes());
  }

  /**
   * Called when a school first signs up.
   * Creates an isolated sandbox tenant + test API key + seed data.
   */
  async provisionSandbox(schoolId: string): Promise<{ testApiKey: string }> {
    const rawKey = `sk_test_${crypto.randomBytes(24).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    await this.prisma.$executeRaw`
      INSERT INTO api_keys (id, school_id, tenant_id, key_hash, name, is_sandbox, is_active, created_at)
      SELECT ${uuidv4()}, ${schoolId}, t.id, ${keyHash}, 'Sandbox Test Key', true, true, NOW()
      FROM tenants t WHERE t.school_id = ${schoolId}
      ON CONFLICT DO NOTHING
    `;

    await this.seedSandboxData(schoolId);
    return { testApiKey: rawKey };
  }

  async seedSandboxData(schoolId: string): Promise<void> {
    // Insert 5 sample students into a sandbox-tagged class
    const students = [
      { name: "Arjun Mehta", admNo: "SBX-001" },
      { name: "Priya Singh", admNo: "SBX-002" },
      { name: "Rahul Sharma", admNo: "SBX-003" },
      { name: "Anjali Reddy", admNo: "SBX-004" },
      { name: "Vikram Nair", admNo: "SBX-005" },
    ];

    for (const s of students) {
      await this.prisma.$executeRaw`
        INSERT INTO students (id, school_id, full_name, admission_no, status, is_sandbox, created_at)
        VALUES (${uuidv4()}, ${schoolId}, ${s.name}, ${s.admNo}, 'ACTIVE', true, NOW())
        ON CONFLICT (school_id, admission_no) DO NOTHING
      `;
    }
  }

  async resetAllSandboxes(): Promise<void> {
    console.log("[Sandbox] Weekly reset starting…");
    const sandboxSchools = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT school_id FROM api_keys WHERE is_sandbox = true AND is_active = true
    `;
    for (const { school_id } of sandboxSchools) {
      // Clear sandbox data
      await this.prisma.$executeRaw`DELETE FROM students WHERE school_id = ${school_id} AND is_sandbox = true`;
      await this.seedSandboxData(school_id);
    }
    console.log(`[Sandbox] Reset complete — ${sandboxSchools.length} tenants`);
  }
}
