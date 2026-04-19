/**
 * POSH (Prevention of Sexual Harassment) Module
 *
 * Legal requirements:
 *  - Internal Complaints Committee (ICC) with 3–10 members; external member mandatory
 *  - Complaint investigation within 90 days
 *  - Annual report filed with District Officer by 31 January
 *  - Policy acknowledgement by all staff annually
 *
 * POCSO mandatory reporting:
 *  - Any abuse incident → DSL notified → POCSO report draft → 24-hour filing deadline
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type ComplaintStatus = "RECEIVED" | "INQUIRY" | "PENDING_REPORT" | "CLOSED" | "APPEALED";
export type ComplaintSeverity = "MINOR" | "MODERATE" | "SEVERE";

@Injectable()
export class PoshService {
  private readonly logger = new Logger(PoshService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── ICC Members ───────────────────────────────────────────────────────────

  async addIccMember(schoolId: string, member: {
    staffId?: string;
    name: string;
    designation: string;
    isExternal: boolean;
    tenureStart: Date;
    tenureEnd: Date;
    phone: string;
    email: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO posh_icc_members (school_id, staff_id, name, designation, is_external, tenure_start, tenure_end, phone, email, active, created_at)
      VALUES (${member.staffId ?? null}, ${member.name}, ${member.designation}, ${member.isExternal},
              ${member.tenureStart}, ${member.tenureEnd}, ${member.phone}, ${member.email}, true, NOW())
    `;
  }

  async getIccMembers(schoolId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT *, (tenure_end < NOW()) AS tenure_expired FROM posh_icc_members
      WHERE school_id = ${schoolId} AND active = true
      ORDER BY is_external ASC, name
    `;
  }

  // ── Complaint Management ──────────────────────────────────────────────────

  async fileComplaint(schoolId: string, complaint: {
    complainantId?: string;  // null if anonymous
    respondentId: string;
    anonymous: boolean;
    description: string;
    incidentDate: Date;
    incidentLocation: string;
    witnesses?: string[];
    severity: ComplaintSeverity;
  }): Promise<{ complaintNo: string; deadline: Date }> {
    const complaintNo = `POSH-${schoolId.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const deadline = new Date(Date.now() + 90 * 86400000); // 90 days

    await this.prisma.$executeRaw`
      INSERT INTO posh_complaints (
        complaint_no, school_id, complainant_id, respondent_id, anonymous,
        description, incident_date, incident_location, witnesses,
        severity, status, filed_at, inquiry_deadline
      )
      VALUES (
        ${complaintNo}, ${schoolId}, ${complaint.complainantId ?? null}, ${complaint.respondentId},
        ${complaint.anonymous}, ${complaint.description}, ${complaint.incidentDate},
        ${complaint.incidentLocation}, ${JSON.stringify(complaint.witnesses ?? [])},
        ${complaint.severity}, 'RECEIVED', NOW(), ${deadline}
      )
    `;

    // Notify ICC chairperson
    this.logger.warn(`POSH complaint filed: ${complaintNo}, deadline: ${deadline.toDateString()}`);
    return { complaintNo, deadline };
  }

  async updateComplaintStatus(complaintNo: string, status: ComplaintStatus, notes: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE posh_complaints SET status = ${status}, last_update_notes = ${notes}, updated_at = NOW()
      WHERE complaint_no = ${complaintNo}
    `;
  }

  async getComplaints(schoolId: string, status?: ComplaintStatus): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT c.*,
             (c.inquiry_deadline < NOW() AND c.status NOT IN ('CLOSED')) AS overdue
      FROM posh_complaints c
      WHERE c.school_id = ${schoolId}
        AND (${status ?? null} IS NULL OR c.status = ${status ?? null})
      ORDER BY c.filed_at DESC
    `;
  }

  // ── Annual Report ─────────────────────────────────────────────────────────

  async generateAnnualReport(schoolId: string, year: number): Promise<any> {
    const complaints = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM filed_at) = ${year}) AS total_filed,
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM filed_at) = ${year} AND status = 'CLOSED') AS closed,
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM filed_at) = ${year} AND status NOT IN ('CLOSED')) AS pending,
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM filed_at) = ${year} AND severity = 'SEVERE') AS severe_cases,
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM filed_at) = ${year} AND anonymous = true) AS anonymous_cases
      FROM posh_complaints WHERE school_id = ${schoolId}
    `;

    const members = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) AS total, SUM(CASE WHEN is_external THEN 1 ELSE 0 END) AS external_members
      FROM posh_icc_members WHERE school_id = ${schoolId} AND active = true
    `;

    const training = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) AS total_staff,
        COUNT(*) FILTER (WHERE posh_training_completed = true AND EXTRACT(YEAR FROM posh_training_date) = ${year}) AS trained_this_year
      FROM staff WHERE school_id = ${schoolId}
    `;

    return {
      year,
      schoolId,
      dueDate: `${year + 1}-01-31`,
      icc: members[0],
      complaints: complaints[0],
      training: training[0],
      generatedAt: new Date().toISOString(),
      note: "Submit to District Officer as per POSH Act Section 21",
    };
  }

  // ── Staff Policy Acknowledgement ──────────────────────────────────────────

  async recordAcknowledgement(schoolId: string, staffId: string, policyVersion: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO posh_acknowledgements (school_id, staff_id, policy_version, acknowledged_at)
      VALUES (${schoolId}, ${staffId}, ${policyVersion}, NOW())
      ON CONFLICT (school_id, staff_id, policy_version) DO UPDATE SET acknowledged_at = NOW()
    `;
  }

  async getPendingAcknowledgements(schoolId: string, policyVersion: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT s.id, s.full_name, s.designation, s.email
      FROM staff s
      WHERE s.school_id = ${schoolId}
        AND NOT EXISTS (
          SELECT 1 FROM posh_acknowledgements pa
          WHERE pa.staff_id = s.id AND pa.policy_version = ${policyVersion}
        )
      ORDER BY s.full_name
    `;
  }

  // ── POCSO Mandatory Reporting ─────────────────────────────────────────────

  async reportPocsOIncident(schoolId: string, incident: {
    dslId: string;
    victimStudentId: string;
    allegedPerpetrator: string;
    incidentDate: Date;
    discoveryDate: Date;
    description: string;
    immediateActionsToken: string[];
  }): Promise<{ incidentRef: string; filingDeadline: Date }> {
    const incidentRef = `POCSO-${schoolId.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const filingDeadline = new Date(incident.discoveryDate.getTime() + 24 * 3600000);

    await this.prisma.$executeRaw`
      INSERT INTO pocso_incidents (
        incident_ref, school_id, dsl_id, victim_student_id, alleged_perpetrator,
        incident_date, discovery_date, description, immediate_actions,
        filing_deadline, reported_to_police, created_at
      )
      VALUES (
        ${incidentRef}, ${schoolId}, ${incident.dslId}, ${incident.victimStudentId},
        ${incident.allegedPerpetrator}, ${incident.incidentDate}, ${incident.discoveryDate},
        ${incident.description}, ${JSON.stringify(incident.immediateActionsToken)},
        ${filingDeadline}, false, NOW()
      )
    `;

    this.logger.error(`POCSO INCIDENT LOGGED: ${incidentRef} — 24hr filing deadline: ${filingDeadline.toISOString()}`);
    return { incidentRef, filingDeadline };
  }

  // ── Child Safeguarding Incident Log ──────────────────────────────────────

  async logSafeguardingIncident(schoolId: string, incident: {
    dslId: string;
    involvedStudentIds: string[];
    type: "BULLYING" | "ABUSE_SUSPECTED" | "SELF_HARM" | "DISCLOSURE" | "ONLINE_SAFETY" | "OTHER";
    description: string;
    actionsTaken: string;
    parentNotified: boolean;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO safeguarding_incidents (
        school_id, dsl_id, involved_students, incident_type, description,
        actions_taken, parent_notified, logged_at
      )
      VALUES (
        ${schoolId}, ${incident.dslId}, ${JSON.stringify(incident.involvedStudentIds)},
        ${incident.type}, ${incident.description}, ${incident.actionsTaken},
        ${incident.parentNotified}, NOW()
      )
    `;
  }

  // ── Fire Safety & Building Compliance ────────────────────────────────────

  async logFireDrill(schoolId: string, drill: {
    date: Date;
    duration_minutes: number;
    participants: number;
    issues_found: string;
    next_drill_date: Date;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO fire_safety_drills (school_id, drill_date, duration_minutes, participants, issues_found, next_drill_date)
      VALUES (${schoolId}, ${drill.date}, ${drill.duration_minutes}, ${drill.participants}, ${drill.issues_found}, ${drill.next_drill_date})
    `;
  }

  async getComplianceCalendar(schoolId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT * FROM building_compliance_items
      WHERE school_id = ${schoolId}
      ORDER BY due_date ASC
    `;
  }
}
