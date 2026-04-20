/**
 * Niche School Type Modules
 *
 * Multi-shift, Mid-day meal (PM POSHAN), Student discipline,
 * Remedial teaching, Practical/lab exams, Career guidance.
 * Board affiliation compliance, Student insurance.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NicheModulesService {
  private readonly logger = new Logger(NicheModulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Multi-Shift School ────────────────────────────────────────────────────

  async getShifts(schoolId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT sh.*, COUNT(cl.id) AS classes_count
      FROM school_shifts sh
      LEFT JOIN classes cl ON cl.shift_id = sh.id
      WHERE sh.school_id = ${schoolId}
      ORDER BY sh.start_time
    `;
  }

  async checkFacilityConflict(schoolId: string, facilityId: string, shiftId: string, slotTime: string, dayOfWeek: number): Promise<boolean> {
    const conflicts = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM timetable_slots
      WHERE school_id = ${schoolId} AND facility_id = ${facilityId}
        AND day_of_week = ${dayOfWeek} AND slot_time = ${slotTime}
        AND shift_id != ${shiftId}
    `;
    return conflicts.length > 0;
  }

  // ── Mid-Day Meal (PM POSHAN) ──────────────────────────────────────────────

  async recordMdmCount(schoolId: string, date: Date, classCounts: { classId: string; count: number }[]): Promise<void> {
    for (const c of classCounts) {
      await this.prisma.$executeRaw`
        INSERT INTO mdm_daily_counts (school_id, class_id, date, beneficiary_count, created_at)
        VALUES (${schoolId}, ${c.classId}, ${date}, ${c.count}, NOW())
        ON CONFLICT (school_id, class_id, date) DO UPDATE SET beneficiary_count = ${c.count}
      `;
    }
  }

  async getMdmMonthlyReport(schoolId: string, month: number, year: number): Promise<any> {
    return this.prisma.$queryRaw`
      SELECT
        c.name AS class_name,
        SUM(dc.beneficiary_count) AS total_beneficiaries,
        COUNT(DISTINCT dc.date) AS days_served,
        AVG(dc.beneficiary_count) AS avg_daily_count
      FROM mdm_daily_counts dc
      JOIN classes c ON c.id = dc.class_id
      WHERE dc.school_id = ${schoolId}
        AND EXTRACT(MONTH FROM dc.date) = ${month}
        AND EXTRACT(YEAR FROM dc.date) = ${year}
      GROUP BY c.name
      ORDER BY c.name
    `;
  }

  async recordMdmStock(schoolId: string, stock: {
    ingredient: string;
    quantityKg: number;
    receiptDate: Date;
    sourceAgency: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO mdm_stock_log (school_id, ingredient, quantity_kg, receipt_date, source_agency, created_at)
      VALUES (${schoolId}, ${stock.ingredient}, ${stock.quantityKg}, ${stock.receiptDate}, ${stock.sourceAgency}, NOW())
    `;
  }

  // ── Student Discipline ────────────────────────────────────────────────────

  async logDisciplineIncident(schoolId: string, incident: {
    studentId: string;
    reportedBy: string;
    type: string;
    description: string;
    date: Date;
    action: "WARNING" | "DETENTION" | "SUSPENSION" | "EXPULSION";
    parentNotifiedAt?: Date;
    principalApproved?: boolean;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO discipline_incidents (school_id, student_id, reported_by, incident_type,
        description, incident_date, action_taken, parent_notified_at, principal_approved,
        pocso_triggered, created_at)
      VALUES (${schoolId}, ${incident.studentId}, ${incident.reportedBy}, ${incident.type},
              ${incident.description}, ${incident.date}, ${incident.action},
              ${incident.parentNotifiedAt ?? null}, ${incident.principalApproved ?? false},
              false, NOW())
    `;

    // Flag serial offender (3+ incidents/term)
    const termStart = new Date(); termStart.setMonth(termStart.getMonth() - 4);
    const recentCount = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) AS count FROM discipline_incidents
      WHERE student_id = ${incident.studentId} AND incident_date >= ${termStart}
    `;
    if (Number(recentCount[0]?.count ?? 0) >= 3) {
      await this.prisma.$executeRaw`
        UPDATE students SET serial_offender_flag = true WHERE id = ${incident.studentId}
      `;
    }
  }

  async getDisciplineHistory(studentId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT * FROM discipline_incidents WHERE student_id = ${studentId}
      ORDER BY incident_date DESC
    `;
  }

  // ── Remedial Teaching ─────────────────────────────────────────────────────

  async identifyRemedialStudents(schoolId: string, classId: string, subjectId: string, thresholdPct: number): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT s.id, s.full_name, AVG(er.percentage) AS avg_percentage
      FROM exam_results er
      JOIN students s ON s.id = er.student_id
      JOIN exams e ON e.id = er.exam_id
      WHERE s.school_id = ${schoolId} AND s.class_id = ${classId}
        AND e.subject_id = ${subjectId}
        AND e.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY s.id, s.full_name
      HAVING AVG(er.percentage) < ${thresholdPct}
      ORDER BY avg_percentage ASC
    `;
  }

  async createRemedialBatch(schoolId: string, batch: {
    subjectId: string;
    teacherId: string;
    studentIds: string[];
    schedule: string;
    startDate: Date;
  }): Promise<string> {
    const batchId = `REM-${Date.now()}`;
    await this.prisma.$executeRaw`
      INSERT INTO remedial_batches (id, school_id, subject_id, teacher_id, student_ids,
        schedule, start_date, status, created_at)
      VALUES (${batchId}, ${schoolId}, ${batch.subjectId}, ${batch.teacherId},
              ${JSON.stringify(batch.studentIds)}, ${batch.schedule}, ${batch.startDate}, 'ACTIVE', NOW())
    `;
    return batchId;
  }

  async recordRemedialAssessment(batchId: string, studentId: string, type: "PRE" | "POST", score: number, maxScore: number): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO remedial_assessments (batch_id, student_id, assessment_type, score, max_score, assessed_at)
      VALUES (${batchId}, ${studentId}, ${type}, ${score}, ${maxScore}, NOW())
    `;
  }

  async getRemedialEffectivenessReport(batchId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT
        s.full_name,
        pre.score AS pre_score, post.score AS post_score,
        post.score - pre.score AS improvement,
        ROUND((post.score - pre.score) * 100.0 / NULLIF(pre.max_score - pre.score, 0), 1) AS improvement_pct
      FROM remedial_batches rb
      JOIN jsonb_array_elements_text(rb.student_ids::jsonb) AS sid(id) ON true
      JOIN students s ON s.id = sid.id::uuid
      LEFT JOIN remedial_assessments pre ON pre.batch_id = rb.id AND pre.student_id = s.id AND pre.assessment_type = 'PRE'
      LEFT JOIN remedial_assessments post ON post.batch_id = rb.id AND post.student_id = s.id AND post.assessment_type = 'POST'
      WHERE rb.id = ${batchId}
    `;
  }

  // ── Career Guidance & College Counselling ─────────────────────────────────

  async recordAptitudeTest(studentId: string, test: {
    testName: string;
    date: Date;
    results: Record<string, number>;
    careerSuggestions: string[];
    counsellorId: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO career_aptitude_tests (student_id, test_name, date, results, career_suggestions, counsellor_id, created_at)
      VALUES (${studentId}, ${test.testName}, ${test.date}, ${JSON.stringify(test.results)},
              ${JSON.stringify(test.careerSuggestions)}, ${test.counsellorId}, NOW())
    `;
  }

  async trackCollegeApplication(studentId: string, application: {
    collegeName: string;
    course: string;
    applicationDeadline: Date;
    status: "PLANNING" | "APPLIED" | "SHORTLISTED" | "INTERVIEW" | "ADMITTED" | "REJECTED" | "WITHDRAWN";
    entryExam?: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO college_applications (student_id, college_name, course, application_deadline,
        status, entry_exam, created_at)
      VALUES (${studentId}, ${application.collegeName}, ${application.course},
              ${application.applicationDeadline}, ${application.status},
              ${application.entryExam ?? null}, NOW())
      ON CONFLICT (student_id, college_name, course) DO UPDATE SET status = ${application.status}
    `;
  }

  // ── Board Affiliation Compliance ──────────────────────────────────────────

  async checkTeacherQualificationCompliance(schoolId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT s.id, s.full_name, s.designation, s.qualification,
             bq.required_qualification,
             CASE WHEN s.qualification ILIKE '%' || bq.required_qualification || '%' THEN 'COMPLIANT'
                  ELSE 'NON_COMPLIANT' END AS status
      FROM staff s
      JOIN board_qualification_requirements bq ON bq.designation = s.designation
        AND bq.board_id = (SELECT board_id FROM schools WHERE id = ${schoolId})
      WHERE s.school_id = ${schoolId} AND s.staff_type = 'TEACHING' AND s.status = 'ACTIVE'
    `;
  }

  async checkStudentTeacherRatio(schoolId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT
        cl.name AS class_name,
        COUNT(DISTINCT s.id) AS student_count,
        COUNT(DISTINCT ts.staff_id) AS teacher_count,
        ROUND(COUNT(DISTINCT s.id)::numeric / NULLIF(COUNT(DISTINCT ts.staff_id), 0), 1) AS ratio,
        bsr.max_ratio AS board_max_ratio,
        CASE WHEN COUNT(DISTINCT s.id)::numeric / NULLIF(COUNT(DISTINCT ts.staff_id), 0) > bsr.max_ratio
             THEN 'BREACH' ELSE 'OK' END AS compliance_status
      FROM classes cl
      JOIN students s ON s.class_id = cl.id AND s.status = 'ACTIVE'
      LEFT JOIN teacher_subjects ts ON ts.class_id = cl.id
      JOIN board_student_ratios bsr ON bsr.grade_level = cl.grade_level
        AND bsr.board_id = (SELECT board_id FROM schools WHERE id = ${schoolId})
      WHERE cl.school_id = ${schoolId}
      GROUP BY cl.name, cl.grade_level, bsr.max_ratio
    `;
  }

  async generateAffiliationRenewalChecklist(schoolId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT item, category, status, document_url, last_verified_at,
             (last_verified_at < NOW() - INTERVAL '1 year') AS needs_renewal
      FROM affiliation_checklist_items
      WHERE school_id = ${schoolId}
      ORDER BY category, item
    `;
  }

  // ── Student Insurance ─────────────────────────────────────────────────────

  async setInsurancePolicy(schoolId: string, policy: {
    insurer: string;
    policyNumber: string;
    sumAssuredRs: number;
    premiumPerStudentRs: number;
    coverageStartDate: Date;
    coverageEndDate: Date;
    coverageDetails: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO student_insurance_policies (school_id, insurer, policy_number, sum_assured_rs,
        premium_per_student_rs, coverage_start_date, coverage_end_date, coverage_details, active, created_at)
      VALUES (${schoolId}, ${policy.insurer}, ${policy.policyNumber}, ${policy.sumAssuredRs},
              ${policy.premiumPerStudentRs}, ${policy.coverageStartDate}, ${policy.coverageEndDate},
              ${policy.coverageDetails}, true, NOW())
      ON CONFLICT (school_id, policy_number) DO UPDATE
        SET coverage_end_date = ${policy.coverageEndDate}, active = true
    `;
  }

  async fileInsuranceClaim(schoolId: string, claim: {
    studentId: string;
    policyId: string;
    accidentDate: Date;
    description: string;
    claimAmountRs: number;
    documents: string[];
  }): Promise<{ claimRef: string }> {
    const claimRef = `CLAIM-${Date.now()}`;
    await this.prisma.$executeRaw`
      INSERT INTO insurance_claims (claim_ref, school_id, student_id, policy_id, accident_date,
        description, claim_amount_rs, documents, status, filed_at)
      VALUES (${claimRef}, ${schoolId}, ${claim.studentId}, ${claim.policyId}, ${claim.accidentDate},
              ${claim.description}, ${claim.claimAmountRs}, ${JSON.stringify(claim.documents)}, 'FILED', NOW())
    `;
    return { claimRef };
  }

  async updateClaimStatus(claimRef: string, status: "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SETTLED", settlementRs?: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE insurance_claims SET status = ${status}, settlement_amount_rs = ${settlementRs ?? null},
             settled_at = ${status === "SETTLED" ? new Date() : null}, updated_at = NOW()
      WHERE claim_ref = ${claimRef}
    `;
  }
}
