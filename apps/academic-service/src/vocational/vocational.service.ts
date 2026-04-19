/**
 * Vocational Education & NEP 2020 Compliance
 *
 * NSQF levels 1–8, industry partner OJT, competency assessment,
 * NEP 2020 competency-based assessment framework,
 * FLN (Foundational Literacy & Numeracy) dashboard for Grades 1–3.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type NsqfLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface VocationalSubject {
  id: string;
  name: string;
  sector: string;
  nsqfLevel: NsqfLevel;
  totalHours: number;
  theoryHours: number;
  practicalHours: number;
  ojtHours: number;
}

export type CompetencyStatus = "ACHIEVED" | "PARTIAL" | "NOT_YET";

@Injectable()
export class VocationalService {
  private readonly logger = new Logger(VocationalService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Vocational Subject Master ─────────────────────────────────────────────

  async createVocationalSubject(schoolId: string, subject: Omit<VocationalSubject, "id">): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO vocational_subjects (school_id, name, sector, nsqf_level, total_hours, theory_hours, practical_hours, ojt_hours, created_at)
      VALUES (${schoolId}, ${subject.name}, ${subject.sector}, ${subject.nsqfLevel}, ${subject.totalHours},
              ${subject.theoryHours}, ${subject.practicalHours}, ${subject.ojtHours}, NOW())
    `;
  }

  async getVocationalSubjects(schoolId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT vs.*, COUNT(se.id) AS enrolled_students
      FROM vocational_subjects vs
      LEFT JOIN vocational_enrolments se ON se.subject_id = vs.id AND se.status = 'ACTIVE'
      WHERE vs.school_id = ${schoolId}
      GROUP BY vs.id
      ORDER BY vs.sector, vs.nsqf_level
    `;
  }

  // ── Industry Partner Linkage ──────────────────────────────────────────────

  async addIndustryPartner(schoolId: string, partner: {
    companyName: string;
    sector: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    moUSignedDate: Date;
    moUExpiryDate: Date;
    capacityPerBatch: number;
    address: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO vocational_industry_partners (school_id, company_name, sector, contact_name, contact_email,
        contact_phone, mou_signed_date, mou_expiry_date, capacity_per_batch, address, active, created_at)
      VALUES (${schoolId}, ${partner.companyName}, ${partner.sector}, ${partner.contactName},
              ${partner.contactEmail}, ${partner.contactPhone}, ${partner.moUSignedDate}, ${partner.moUExpiryDate},
              ${partner.capacityPerBatch}, ${partner.address}, true, NOW())
    `;
  }

  // ── OJT Placement ────────────────────────────────────────────────────────

  async assignOJT(schoolId: string, placement: {
    studentId: string;
    subjectId: string;
    partnerId: string;
    startDate: Date;
    endDate: Date;
    supervisorName: string;
    supervisorContact: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO vocational_ojt_placements (school_id, student_id, subject_id, partner_id, start_date, end_date,
        supervisor_name, supervisor_contact, status, created_at)
      VALUES (${schoolId}, ${placement.studentId}, ${placement.subjectId}, ${placement.partnerId},
              ${placement.startDate}, ${placement.endDate}, ${placement.supervisorName},
              ${placement.supervisorContact}, 'ACTIVE', NOW())
    `;
  }

  async recordOJTAttendance(placementId: string, date: Date, present: boolean, notes?: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO ojt_attendance (placement_id, date, present, notes, recorded_at)
      VALUES (${placementId}, ${date}, ${present}, ${notes ?? null}, NOW())
      ON CONFLICT (placement_id, date) DO UPDATE SET present = ${present}, notes = ${notes ?? null}
    `;
  }

  // ── NSQF Competency Assessment ────────────────────────────────────────────

  async recordCompetencyAssessment(schoolId: string, assessment: {
    studentId: string;
    subjectId: string;
    competencyId: string;
    assessorType: "INTERNAL" | "EXTERNAL";
    assessorId: string;
    score: number;
    maxScore: number;
    status: CompetencyStatus;
    date: Date;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO vocational_competency_assessments (
        school_id, student_id, subject_id, competency_id, assessor_type, assessor_id,
        score, max_score, status, assessment_date, created_at
      )
      VALUES (
        ${schoolId}, ${assessment.studentId}, ${assessment.subjectId}, ${assessment.competencyId},
        ${assessment.assessorType}, ${assessment.assessorId}, ${assessment.score}, ${assessment.maxScore},
        ${assessment.status}, ${assessment.date}, NOW()
      )
    `;
  }

  async checkNsqfCertificateEligibility(studentId: string, subjectId: string): Promise<{
    eligible: boolean;
    completedCompetencies: number;
    totalCompetencies: number;
    ojtHoursCompleted: number;
    ojtHoursRequired: number;
  }> {
    const [competencies, ojt, subject] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'ACHIEVED') AS achieved
        FROM vocational_competency_assessments
        WHERE student_id = ${studentId} AND subject_id = ${subjectId}
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT COALESCE(SUM(8), 0) AS hours_completed
        FROM ojt_attendance oa
        JOIN vocational_ojt_placements p ON p.id = oa.placement_id
        WHERE p.student_id = ${studentId} AND p.subject_id = ${subjectId} AND oa.present = true
      `,
      this.prisma.$queryRaw<any[]>`SELECT ojt_hours FROM vocational_subjects WHERE id = ${subjectId}`,
    ]);

    const ojtCompleted = Number(ojt[0]?.hours_completed ?? 0);
    const ojtRequired = Number(subject[0]?.ojt_hours ?? 0);
    const achievedCount = Number(competencies[0]?.achieved ?? 0);
    const totalCount = Number(competencies[0]?.total ?? 0);

    return {
      eligible: achievedCount === totalCount && totalCount > 0 && ojtCompleted >= ojtRequired,
      completedCompetencies: achievedCount,
      totalCompetencies: totalCount,
      ojtHoursCompleted: ojtCompleted,
      ojtHoursRequired: ojtRequired,
    };
  }

  // ── NEP 2020 Competency-Based Assessment ──────────────────────────────────

  async mapLessonToOutcome(lessonId: string, learningOutcomeIds: string[]): Promise<void> {
    for (const outcomeId of learningOutcomeIds) {
      await this.prisma.$executeRaw`
        INSERT INTO lesson_learning_outcomes (lesson_id, learning_outcome_id)
        VALUES (${lessonId}, ${outcomeId})
        ON CONFLICT DO NOTHING
      `;
    }
  }

  async recordCompetencyProgress(studentId: string, competencyId: string, teacherId: string, status: CompetencyStatus, evidence?: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO student_competencies (student_id, competency_id, teacher_id, status, evidence, assessed_at)
      VALUES (${studentId}, ${competencyId}, ${teacherId}, ${status}, ${evidence ?? null}, NOW())
      ON CONFLICT (student_id, competency_id) DO UPDATE
        SET status = ${status}, evidence = ${evidence ?? null}, teacher_id = ${teacherId}, assessed_at = NOW()
    `;
  }

  async getHolisticProgressCard(studentId: string, termId: string): Promise<any> {
    const [cognitive, physical, social, emotional, fln] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT c.domain, c.description, sc.status
        FROM student_competencies sc
        JOIN competencies c ON c.id = sc.competency_id
        WHERE sc.student_id = ${studentId} AND c.domain = 'COGNITIVE'
      `,
      this.prisma.$queryRaw`
        SELECT c.domain, c.description, sc.status
        FROM student_competencies sc
        JOIN competencies c ON c.id = sc.competency_id
        WHERE sc.student_id = ${studentId} AND c.domain = 'PHYSICAL'
      `,
      this.prisma.$queryRaw`
        SELECT c.domain, c.description, sc.status
        FROM student_competencies sc
        JOIN competencies c ON c.id = sc.competency_id
        WHERE sc.student_id = ${studentId} AND c.domain = 'SOCIAL'
      `,
      this.prisma.$queryRaw`
        SELECT c.domain, c.description, sc.status
        FROM student_competencies sc
        JOIN competencies c ON c.id = sc.competency_id
        WHERE sc.student_id = ${studentId} AND c.domain = 'EMOTIONAL'
      `,
      // FLN for Grades 1–3
      this.prisma.$queryRaw`
        SELECT fln_reading_level, fln_numeracy_level, fln_assessed_at
        FROM students WHERE id = ${studentId}
      `,
    ]);

    return {
      studentId, termId,
      cognitive, physical, social, emotional,
      fln: fln[0] ?? null,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── FLN Dashboard (Grades 1–3) ────────────────────────────────────────────

  async updateFlnLevel(studentId: string, teacherId: string, readingLevel: string, numeracyLevel: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE students SET fln_reading_level = ${readingLevel}, fln_numeracy_level = ${numeracyLevel},
             fln_teacher_id = ${teacherId}, fln_assessed_at = NOW()
      WHERE id = ${studentId}
    `;
  }

  async getFlnDashboard(schoolId: string, gradeIds: string[]): Promise<any> {
    return this.prisma.$queryRaw`
      SELECT
        cl.name AS class_name,
        COUNT(*) AS total_students,
        COUNT(*) FILTER (WHERE s.fln_reading_level = 'GRADE_LEVEL') AS reading_at_grade,
        COUNT(*) FILTER (WHERE s.fln_reading_level = 'BELOW_GRADE') AS reading_below_grade,
        COUNT(*) FILTER (WHERE s.fln_numeracy_level = 'GRADE_LEVEL') AS numeracy_at_grade,
        COUNT(*) FILTER (WHERE s.fln_numeracy_level = 'BELOW_GRADE') AS numeracy_below_grade
      FROM students s
      JOIN classes cl ON cl.id = s.class_id
      WHERE s.school_id = ${schoolId}
        AND s.class_id = ANY(${gradeIds}::uuid[])
        AND s.status = 'ACTIVE'
      GROUP BY cl.name
      ORDER BY cl.name
    `;
  }
}
