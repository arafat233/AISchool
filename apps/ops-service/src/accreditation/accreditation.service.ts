/**
 * Accreditation & Quality Management
 *
 * Quality framework (ISO 21001 / NAAC), SSR data compilation,
 * Peer review scheduling, Quality improvement action plan.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type QualityFramework = "ISO_21001" | "NAAC" | "BOARD_QA" | "IB_EVALUATION" | "CAMBRIDGE_INSPECTION";

@Injectable()
export class AccreditationService {
  private readonly logger = new Logger(AccreditationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async setQualityFramework(schoolId: string, framework: QualityFramework, targetDate: Date, coordinatorId: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO accreditation_setup (school_id, framework, target_date, coordinator_id, status, created_at)
      VALUES (${schoolId}, ${framework}, ${targetDate}, ${coordinatorId}, 'IN_PROGRESS', NOW())
      ON CONFLICT (school_id, framework) DO UPDATE
        SET target_date = ${targetDate}, coordinator_id = ${coordinatorId}
    `;
  }

  async compileSsrData(schoolId: string, academicYearId: string): Promise<any> {
    const [school, enrolment, staff, results, compliance, finance] = await Promise.all([
      this.prisma.$queryRaw<any[]>`SELECT * FROM schools WHERE id = ${schoolId}`,
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE gender = 'FEMALE') AS girls,
               COUNT(*) FILTER (WHERE is_cwsn = true) AS cwsn,
               COUNT(*) FILTER (WHERE is_rte = true) AS rte
        FROM students WHERE school_id = ${schoolId} AND status = 'ACTIVE'
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE gender = 'FEMALE') AS female,
               COUNT(*) FILTER (WHERE qualification ILIKE '%B.Ed%') AS trained,
               COUNT(*) FILTER (WHERE experience_years >= 5) AS experienced
        FROM staff WHERE school_id = ${schoolId} AND staff_type = 'TEACHING' AND status = 'ACTIVE'
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT ROUND(AVG(er.percentage), 2) AS avg_percentage,
               COUNT(*) FILTER (WHERE er.percentage >= 75) AS distinction_count
        FROM exam_results er
        JOIN exams e ON e.id = er.exam_id AND e.academic_year_id = ${academicYearId}
        WHERE er.student_id IN (SELECT id FROM students WHERE school_id = ${schoolId})
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(*) AS total_items,
               COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed
        FROM compliance_items WHERE school_id = ${schoolId}
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT SUM(total_rs) AS total_fees_collected FROM fee_invoices fi
        JOIN students s ON s.id = fi.student_id
        WHERE s.school_id = ${schoolId} AND fi.academic_year_id = ${academicYearId}
      `,
    ]);

    return {
      generatedAt: new Date().toISOString(),
      school: school[0],
      enrolment: enrolment[0],
      staff: staff[0],
      academicResults: results[0],
      compliance: compliance[0],
      finance: finance[0],
      note: "Self-Study Report data compiled from ERP. Verify and supplement with physical records before submission.",
    };
  }

  async scheduleInspection(schoolId: string, inspection: {
    framework: QualityFramework;
    inspectionDate: Date;
    inspectorNames: string[];
    type: "PEER_REVIEW" | "EXTERNAL_ASSESSMENT" | "MOCK" | "FOLLOW_UP";
    notes?: string;
  }): Promise<string> {
    const inspectionId = `INSP-${Date.now()}`;
    await this.prisma.$executeRaw`
      INSERT INTO accreditation_inspections (id, school_id, framework, inspection_date, inspector_names,
        inspection_type, notes, status, created_at)
      VALUES (${inspectionId}, ${schoolId}, ${inspection.framework}, ${inspection.inspectionDate},
              ${JSON.stringify(inspection.inspectorNames)}, ${inspection.type},
              ${inspection.notes ?? null}, 'SCHEDULED', NOW())
    `;
    return inspectionId;
  }

  async getReadinessChecklist(schoolId: string, framework: QualityFramework): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT item, category, required_evidence, status, document_url, last_verified_at,
             responsible_person_id
      FROM accreditation_checklist_items
      WHERE school_id = ${schoolId} AND framework = ${framework}
      ORDER BY category, item
    `;
  }

  async createImprovementAction(schoolId: string, action: {
    source: string;  // e.g. "ISO 21001 Audit Finding #3"
    finding: string;
    rootCause: string;
    correctiveAction: string;
    responsibleId: string;
    targetDate: Date;
    priority: "HIGH" | "MEDIUM" | "LOW";
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO quality_improvement_actions (school_id, source, finding, root_cause, corrective_action,
        responsible_id, target_date, priority, status, created_at)
      VALUES (${schoolId}, ${action.source}, ${action.finding}, ${action.rootCause},
              ${action.correctiveAction}, ${action.responsibleId}, ${action.targetDate},
              ${action.priority}, 'OPEN', NOW())
    `;
  }

  async closeImprovementAction(actionId: string, closedById: string, verificationEvidence: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE quality_improvement_actions
      SET status = 'CLOSED', closed_by_id = ${closedById},
          verification_evidence = ${verificationEvidence}, closed_at = NOW()
      WHERE id = ${actionId}
    `;
  }

  async getImprovementActionReport(schoolId: string): Promise<any> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT priority, status, COUNT(*) AS count
      FROM quality_improvement_actions WHERE school_id = ${schoolId}
      GROUP BY priority, status
    `;
    const overdue = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) AS count FROM quality_improvement_actions
      WHERE school_id = ${schoolId} AND status != 'CLOSED' AND target_date < NOW()
    `;
    return { byStatus: rows, overdueCount: Number(overdue[0]?.count ?? 0) };
  }
}
