/**
 * Labour Law & Statutory Compliance
 *
 * Annual compliance calendar with reminders + document tracking.
 * Modules: EPF, ESI, Professional Tax, Labour Welfare Fund, UDISE+, RTI Management.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface ComplianceItem {
  id: string;
  schoolId: string;
  category: "EPF" | "ESI" | "PT" | "LWF" | "UDISE" | "RTI" | "MINIMUM_WAGE" | "SHOP_ACT" | "CONTRACT_LABOUR" | "OTHER";
  name: string;
  description: string;
  frequency: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "ANNUAL";
  dueDate: Date;
  responsiblePersonId: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  documentUrl?: string;
  completedAt?: Date;
  notes?: string;
}

// Standard annual compliance items for Indian schools
const STANDARD_ITEMS = [
  { category: "EPF", name: "EPF ECR Monthly Filing", frequency: "MONTHLY", dueDayOfMonth: 15 },
  { category: "ESI", name: "ESI Monthly Challan", frequency: "MONTHLY", dueDayOfMonth: 21 },
  { category: "PT", name: "Professional Tax Monthly Deduction Remittance", frequency: "MONTHLY", dueDayOfMonth: 20 },
  { category: "LWF", name: "Labour Welfare Fund Contribution (Bi-Annual)", frequency: "HALF_YEARLY", dueMonths: [6, 12], dueDayOfMonth: 15 },
  { category: "EPF", name: "EPF Annual Return (Form 3A / 6A)", frequency: "ANNUAL", dueMonth: 4, dueDayOfMonth: 30 },
  { category: "ESI", name: "ESI Annual Return", frequency: "ANNUAL", dueMonth: 11, dueDayOfMonth: 12 },
  { category: "PT", name: "Professional Tax Annual Return", frequency: "ANNUAL", dueMonth: 3, dueDayOfMonth: 31 },
  { category: "UDISE", name: "UDISE+ Annual Data Submission", frequency: "ANNUAL", dueMonth: 9, dueDayOfMonth: 30 },
  { category: "MINIMUM_WAGE", name: "Minimum Wage Compliance Self-Audit", frequency: "QUARTERLY", dueMonths: [3, 6, 9, 12], dueDayOfMonth: 15 },
];

@Injectable()
export class LabourComplianceService {
  private readonly logger = new Logger(LabourComplianceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Compliance Calendar ────────────────────────────────────────────────────

  async getCalendar(schoolId: string, year?: number): Promise<ComplianceItem[]> {
    const y = year ?? new Date().getFullYear();
    return this.prisma.$queryRaw`
      SELECT c.*,
             s.full_name AS responsible_person_name,
             (c.due_date < NOW() AND c.status = 'PENDING') AS overdue
      FROM compliance_items c
      LEFT JOIN staff s ON s.id = c.responsible_person_id
      WHERE c.school_id = ${schoolId}
        AND EXTRACT(YEAR FROM c.due_date) = ${y}
      ORDER BY c.due_date ASC
    `;
  }

  async markCompleted(itemId: string, documentUrl: string, notes: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE compliance_items
      SET status = 'COMPLETED', document_url = ${documentUrl}, notes = ${notes}, completed_at = NOW()
      WHERE id = ${itemId}
    `;
  }

  // ── EPF ───────────────────────────────────────────────────────────────────

  async generateEpfEcr(schoolId: string, month: number, year: number): Promise<any> {
    const payrollData = await this.prisma.$queryRaw<any[]>`
      SELECT
        s.uan_number, s.full_name, s.epf_number,
        p.basic_rs, p.da_rs, p.epf_employee_rs, p.epf_employer_rs
      FROM payslips p
      JOIN staff s ON s.id = p.staff_id
      WHERE p.school_id = ${schoolId}
        AND p.month = ${month} AND p.year = ${year}
        AND s.epf_applicable = true
      ORDER BY s.uan_number
    `;

    // ECR 2.0 format: UAN, name, gross wages, EPF wages, EPS wages, EE contri, ER contri
    const records = payrollData.map(r => ({
      uan: r.uan_number,
      name: r.full_name,
      grossWages: r.basic_rs + r.da_rs,
      epfWages: Math.min(r.basic_rs + r.da_rs, 15000),
      epsWages: Math.min(r.basic_rs + r.da_rs, 15000),
      eeContribution: r.epf_employee_rs,
      erContribution: r.epf_employer_rs,
    }));

    return {
      establishment: schoolId,
      month: `${year}-${String(month).padStart(2, "0")}`,
      totalMembers: records.length,
      totalEeContribution: records.reduce((s, r) => s + r.eeContribution, 0),
      totalErContribution: records.reduce((s, r) => s + r.erContribution, 0),
      records,
      format: "ECR_2.0",
    };
  }

  // ── ESI ───────────────────────────────────────────────────────────────────

  async generateEsiChallan(schoolId: string, month: number, year: number): Promise<any> {
    const esiData = await this.prisma.$queryRaw<any[]>`
      SELECT s.esic_number, s.full_name, p.gross_rs,
             p.esi_employee_rs, p.esi_employer_rs
      FROM payslips p
      JOIN staff s ON s.id = p.staff_id
      WHERE p.school_id = ${schoolId}
        AND p.month = ${month} AND p.year = ${year}
        AND s.esi_applicable = true
    `;

    return {
      schoolId,
      period: `${year}-${String(month).padStart(2, "0")}`,
      employees: esiData.length,
      totalEeContribution: esiData.reduce((s, r) => s + Number(r.esi_employee_rs), 0),
      totalErContribution: esiData.reduce((s, r) => s + Number(r.esi_employer_rs), 0),
      records: esiData,
    };
  }

  // ── Minimum Wage Audit ────────────────────────────────────────────────────

  async checkMinimumWageCompliance(schoolId: string, stateCode: string): Promise<any[]> {
    const breaches = await this.prisma.$queryRaw<any[]>`
      SELECT s.id, s.full_name, s.designation, s.employment_type,
             p.basic_rs + p.da_rs AS current_wages,
             mw.minimum_wage_rs,
             (p.basic_rs + p.da_rs) - mw.minimum_wage_rs AS difference_rs
      FROM staff s
      JOIN payslips p ON p.staff_id = s.id AND p.month = EXTRACT(MONTH FROM NOW()) AND p.year = EXTRACT(YEAR FROM NOW())
      JOIN minimum_wages mw ON mw.state_code = ${stateCode} AND mw.category = s.wage_category
      WHERE s.school_id = ${schoolId}
        AND (p.basic_rs + p.da_rs) < mw.minimum_wage_rs
    `;

    if (breaches.length > 0) {
      this.logger.warn(`Minimum wage breaches detected at school ${schoolId}: ${breaches.length} employees`);
    }
    return breaches;
  }

  // ── RTI Management ────────────────────────────────────────────────────────

  async registerRtiApplication(schoolId: string, application: {
    applicantName: string;
    applicantEmail?: string;
    subject: string;
    receivedDate: Date;
    departmentId: string;
  }): Promise<{ rtiNo: string; deadline: Date }> {
    const rtiNo = `RTI/${schoolId.slice(0, 4).toUpperCase()}/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
    const deadline = new Date(application.receivedDate.getTime() + 30 * 86400000);

    await this.prisma.$executeRaw`
      INSERT INTO rti_applications (rti_no, school_id, applicant_name, applicant_email, subject,
                                    received_date, department_id, response_deadline, status)
      VALUES (${rtiNo}, ${schoolId}, ${application.applicantName}, ${application.applicantEmail ?? null},
              ${application.subject}, ${application.receivedDate}, ${application.departmentId},
              ${deadline}, 'PENDING')
    `;

    return { rtiNo, deadline };
  }

  async getRtiRegister(schoolId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT r.*,
             (r.response_deadline < NOW() AND r.status = 'PENDING') AS overdue,
             EXTRACT(DAY FROM r.response_deadline - NOW()) AS days_remaining
      FROM rti_applications r
      WHERE r.school_id = ${schoolId}
      ORDER BY r.received_date DESC
    `;
  }

  // ── UDISE+ Data Export ────────────────────────────────────────────────────

  async generateUdiseData(schoolId: string, academicYear: string): Promise<any> {
    const [school, students, staff, infra] = await Promise.all([
      this.prisma.$queryRaw<any[]>`SELECT * FROM schools WHERE id = ${schoolId}`,
      this.prisma.$queryRaw<any[]>`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE gender = 'MALE') AS boys,
          COUNT(*) FILTER (WHERE gender = 'FEMALE') AS girls,
          COUNT(*) FILTER (WHERE category = 'SC') AS sc,
          COUNT(*) FILTER (WHERE category = 'ST') AS st,
          COUNT(*) FILTER (WHERE category = 'OBC') AS obc,
          COUNT(*) FILTER (WHERE is_cwsn = true) AS cwsn
        FROM students WHERE school_id = ${schoolId} AND status = 'ACTIVE'
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE gender = 'FEMALE') AS female,
               COUNT(*) FILTER (WHERE qualification LIKE '%B.Ed%' OR qualification LIKE '%B.T%') AS trained
        FROM staff WHERE school_id = ${schoolId} AND status = 'ACTIVE' AND staff_type = 'TEACHING'
      `,
      this.prisma.$queryRaw<any[]>`SELECT * FROM school_infrastructure WHERE school_id = ${schoolId}`,
    ]);

    return {
      udiseCode: school[0]?.udise_code,
      schoolName: school[0]?.name,
      academicYear,
      students: students[0],
      teachers: staff[0],
      infrastructure: infra[0],
      exportedAt: new Date().toISOString(),
    };
  }
}
