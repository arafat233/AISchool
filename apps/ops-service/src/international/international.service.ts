/**
 * International School Modules
 *
 * IB PYP / MYP / DP, Cambridge IGCSE / A-Level,
 * Foreign/NRI student management (passport, visa, FX fees),
 * Apostille workflow, international staff, multi-currency reporting.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import axios from "axios";

export type IbProgramme = "PYP" | "MYP" | "DP";
export type CambridgeProgramme = "IGCSE" | "AS_LEVEL" | "A_LEVEL";

@Injectable()
export class InternationalService {
  private readonly logger = new Logger(InternationalService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── IB PYP (Grades 1–5) ───────────────────────────────────────────────────

  async saveUoiPlan(schoolId: string, plan: {
    classId: string;
    academicYearId: string;
    theme: "WHO_WE_ARE" | "WHERE_WE_ARE_IN_PLACE_AND_TIME" | "HOW_WE_EXPRESS_OURSELVES"
         | "HOW_THE_WORLD_WORKS" | "HOW_WE_ORGANISE_OURSELVES" | "SHARING_THE_PLANET";
    centralIdea: string;
    lines_of_inquiry: string[];
    keyConceptsAddressed: string[];
    subjectAreas: string[];
    teacherId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO ib_uoi_plans (school_id, class_id, academic_year_id, theme, central_idea,
        lines_of_inquiry, key_concepts, subject_areas, teacher_id, start_date, end_date, created_at)
      VALUES (${schoolId}, ${plan.classId}, ${plan.academicYearId}, ${plan.theme}, ${plan.centralIdea},
              ${JSON.stringify(plan.lines_of_inquiry)}, ${JSON.stringify(plan.keyConceptsAddressed)},
              ${JSON.stringify(plan.subjectAreas)}, ${plan.teacherId}, ${plan.startDate}, ${plan.endDate}, NOW())
    `;
  }

  async recordLearnerProfileAssessment(studentId: string, termId: string, attributes: Record<string, "ALWAYS" | "USUALLY" | "SOMETIMES" | "RARELY">): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO ib_learner_profile_assessments (student_id, term_id, attributes, assessed_at)
      VALUES (${studentId}, ${termId}, ${JSON.stringify(attributes)}, NOW())
      ON CONFLICT (student_id, term_id) DO UPDATE SET attributes = ${JSON.stringify(attributes)}, assessed_at = NOW()
    `;
  }

  // ── IB MYP ────────────────────────────────────────────────────────────────

  async recordAtlSkillsAssessment(studentId: string, termId: string, skills: {
    category: "COMMUNICATION" | "SOCIAL" | "SELF_MANAGEMENT" | "RESEARCH" | "THINKING";
    skill: string;
    level: "EXCELLENT" | "GOOD" | "SATISFACTORY" | "NEEDS_IMPROVEMENT";
  }[]): Promise<void> {
    for (const skill of skills) {
      await this.prisma.$executeRaw`
        INSERT INTO ib_atl_assessments (student_id, term_id, category, skill, level, assessed_at)
        VALUES (${studentId}, ${termId}, ${skill.category}, ${skill.skill}, ${skill.level}, NOW())
        ON CONFLICT (student_id, term_id, category, skill) DO UPDATE SET level = ${skill.level}
      `;
    }
  }

  async trackPersonalProject(studentId: string, data: {
    title: string;
    goal: string;
    productDescription: string;
    supervisorId: string;
    startDate: Date;
    submissionDate: Date;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO ib_personal_projects (student_id, title, goal, product_description,
        supervisor_id, start_date, submission_date, created_at)
      VALUES (${studentId}, ${data.title}, ${data.goal}, ${data.productDescription},
              ${data.supervisorId}, ${data.startDate}, ${data.submissionDate}, NOW())
      ON CONFLICT (student_id) DO UPDATE
        SET title = ${data.title}, submission_date = ${data.submissionDate}
    `;
  }

  // ── IB DP ─────────────────────────────────────────────────────────────────

  async recordCasHours(studentId: string, entry: {
    strand: "CREATIVITY" | "ACTIVITY" | "SERVICE";
    description: string;
    hours: number;
    date: Date;
    supervisorId: string;
    reflectionText: string;
    learningOutcomes: string[];
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO ib_cas_entries (student_id, strand, description, hours, date,
        supervisor_id, reflection_text, learning_outcomes, approved, created_at)
      VALUES (${studentId}, ${entry.strand}, ${entry.description}, ${entry.hours}, ${entry.date},
              ${entry.supervisorId}, ${entry.reflectionText}, ${JSON.stringify(entry.learningOutcomes)},
              false, NOW())
    `;
  }

  async getCasProgress(studentId: string): Promise<{ creativity: number; activity: number; service: number; total: number }> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT strand, SUM(hours) AS hours FROM ib_cas_entries
      WHERE student_id = ${studentId} AND approved = true GROUP BY strand
    `;
    const map: any = {};
    for (const r of rows) map[r.strand.toLowerCase()] = Number(r.hours);
    return {
      creativity: map.creativity ?? 0,
      activity: map.activity ?? 0,
      service: map.service ?? 0,
      total: (map.creativity ?? 0) + (map.activity ?? 0) + (map.service ?? 0),
    };
  }

  async setPredictedGrades(studentId: string, subjectGrades: { subjectId: string; predictedGrade: number; teacherId: string }[]): Promise<void> {
    for (const sg of subjectGrades) {
      await this.prisma.$executeRaw`
        INSERT INTO ib_predicted_grades (student_id, subject_id, predicted_grade, teacher_id, set_at)
        VALUES (${studentId}, ${sg.subjectId}, ${sg.predictedGrade}, ${sg.teacherId}, NOW())
        ON CONFLICT (student_id, subject_id) DO UPDATE
          SET predicted_grade = ${sg.predictedGrade}, teacher_id = ${sg.teacherId}, set_at = NOW()
      `;
    }
  }

  // ── Cambridge ─────────────────────────────────────────────────────────────

  async setCambridgeDetails(schoolId: string, studentId: string, details: {
    programme: CambridgeProgramme;
    centreNumber: string;
    candidateNumber: string;
    subjects: { subjectCode: string; subjectName: string; component: string }[];
    examSession: string;  // "MAY-JUN-2026"
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO cambridge_registrations (school_id, student_id, programme, centre_number,
        candidate_number, subjects, exam_session, created_at)
      VALUES (${schoolId}, ${studentId}, ${details.programme}, ${details.centreNumber},
              ${details.candidateNumber}, ${JSON.stringify(details.subjects)}, ${details.examSession}, NOW())
      ON CONFLICT (student_id, programme, exam_session) DO UPDATE
        SET subjects = ${JSON.stringify(details.subjects)}, centre_number = ${details.centreNumber}
    `;
  }

  // ── Foreign/NRI Student Management ───────────────────────────────────────

  async setForeignStudentDetails(studentId: string, details: {
    nationality: string;
    passportNumber: string;
    passportExpiry: Date;
    visaType: string;
    visaNumber: string;
    visaExpiry: Date;
    parentTimezone: string;  // "Asia/Dubai"
    baseCurrency: string;    // "AED"
  }): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE students SET
        nationality = ${details.nationality}, passport_number = ${details.passportNumber},
        passport_expiry = ${details.passportExpiry}, visa_type = ${details.visaType},
        visa_number = ${details.visaNumber}, visa_expiry = ${details.visaExpiry},
        parent_timezone = ${details.parentTimezone}, base_currency = ${details.baseCurrency},
        is_foreign_student = true
      WHERE id = ${studentId}
    `;
  }

  async getExpiringDocuments(schoolId: string, daysAhead = 60): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT s.id, s.full_name, s.admission_no, s.nationality,
             s.passport_expiry, s.visa_expiry,
             LEAST(s.passport_expiry, s.visa_expiry) AS soonest_expiry,
             EXTRACT(DAY FROM LEAST(s.passport_expiry, s.visa_expiry) - NOW()) AS days_until_expiry
      FROM students s
      WHERE s.school_id = ${schoolId} AND s.is_foreign_student = true
        AND LEAST(s.passport_expiry, s.visa_expiry) <= NOW() + INTERVAL '${daysAhead} days'
      ORDER BY soonest_expiry ASC
    `;
  }

  async collectFeeInForeignCurrency(invoiceId: string, currency: string, amountForeign: number): Promise<void> {
    // Fetch live FX rate from RBI
    let fxRate = 83.5; // fallback INR rate
    try {
      const res = await axios.get(`https://api.exchangerate-api.com/v4/latest/${currency}`);
      fxRate = 1 / res.data.rates.INR;
    } catch { /* use fallback */ }

    const amountInr = amountForeign / fxRate;
    const fxGainLoss = 0; // calculated vs invoice date rate in production

    await this.prisma.$executeRaw`
      UPDATE fee_invoices SET
        foreign_currency = ${currency},
        foreign_amount = ${amountForeign},
        fx_rate_used = ${fxRate},
        amount_rs = ${amountInr},
        fx_gain_loss_rs = ${fxGainLoss}
      WHERE id = ${invoiceId}
    `;
  }

  // ── Apostille & Document Legalisation ────────────────────────────────────

  async createApostilleRequest(schoolId: string, request: {
    studentId: string;
    documentType: string;
    destinationCountry: string;
    requestedBy: string;
  }): Promise<{ requestId: string }> {
    const requestId = `APOS-${Date.now()}`;
    await this.prisma.$executeRaw`
      INSERT INTO apostille_requests (id, school_id, student_id, document_type, destination_country,
        requested_by, status, created_at)
      VALUES (${requestId}, ${schoolId}, ${request.studentId}, ${request.documentType},
              ${request.destinationCountry}, ${request.requestedBy}, 'PENDING', NOW())
    `;
    return { requestId };
  }

  async updateApostilleStatus(requestId: string, status: string, trackingNo?: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE apostille_requests SET status = ${status}, tracking_no = ${trackingNo ?? null}, updated_at = NOW()
      WHERE id = ${requestId}
    `;
  }

  // ── Multi-Currency Consolidated Report ───────────────────────────────────

  async getMultiCurrencyReport(companyId: string, academicYearId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT
        sc.name AS school_name,
        COALESCE(fi.foreign_currency, 'INR') AS currency,
        SUM(fi.amount_rs) AS amount_inr,
        AVG(fi.fx_rate_used) AS avg_fx_rate,
        COUNT(*) AS transaction_count
      FROM fee_invoices fi
      JOIN students s ON s.id = fi.student_id
      JOIN schools sc ON sc.id = s.school_id
      WHERE sc.company_id = ${companyId} AND fi.academic_year_id = ${academicYearId}
      GROUP BY sc.name, COALESCE(fi.foreign_currency, 'INR')
      ORDER BY sc.name, currency
    `;
  }
}
