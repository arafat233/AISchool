/**
 * Special Education & IEP (Individualised Education Plan)
 *
 * CWSN student profiles, IEP creation + review cycle,
 * exam accommodations, special educator sessions,
 * government compliance reports.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type DisabilityType = "VISUAL_IMPAIRMENT" | "HEARING_IMPAIRMENT" | "LOCOMOTOR_DISABILITY"
  | "INTELLECTUAL_DISABILITY" | "AUTISM_SPECTRUM" | "LEARNING_DISABILITY"
  | "SPEECH_LANGUAGE" | "MULTIPLE_DISABILITIES" | "OTHER";

export interface IepGoal {
  domain: "ACADEMIC" | "COMMUNICATION" | "SOCIAL" | "MOTOR" | "SELF_CARE" | "BEHAVIOUR";
  goal: string;
  baselineLevel: string;
  targetLevel: string;
  strategies: string[];
  timeline: string;
  measurableIndicators: string[];
}

export interface ExamAccommodation {
  type: "EXTRA_TIME" | "SEPARATE_ROOM" | "SCRIBE" | "ORAL_EXAM" | "LARGE_PRINT" | "READER";
  details: string;
  boardApproved: boolean;
  boardApprovalNo?: string;
}

@Injectable()
export class IepService {
  private readonly logger = new Logger(IepService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── CWSN Student Profile ──────────────────────────────────────────────────

  async setCwsnProfile(studentId: string, profile: {
    disabilityType: DisabilityType;
    disabilityCertificateNo: string;
    disabilityPercentage: number;
    diagnosedBy: string;
    diagnosisDate: Date;
    assistiveTechNeeded: string[];
    governmentBenefits: string[];  // e.g. ["FREE_BOOKS", "TRANSPORT_SUBSIDY", "SCHOLARSHIP"]
    isUdidRegistered: boolean;
    udidNo?: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO cwsn_profiles (
        student_id, disability_type, disability_cert_no, disability_percentage,
        diagnosed_by, diagnosis_date, assistive_tech_needed, government_benefits,
        is_udid_registered, udid_no, created_at
      )
      VALUES (
        ${studentId}, ${profile.disabilityType}, ${profile.disabilityCertificateNo},
        ${profile.disabilityPercentage}, ${profile.diagnosedBy}, ${profile.diagnosisDate},
        ${JSON.stringify(profile.assistiveTechNeeded)}, ${JSON.stringify(profile.governmentBenefits)},
        ${profile.isUdidRegistered}, ${profile.udidNo ?? null}, NOW()
      )
      ON CONFLICT (student_id) DO UPDATE
        SET disability_type = ${profile.disabilityType},
            government_benefits = ${JSON.stringify(profile.governmentBenefits)},
            assistive_tech_needed = ${JSON.stringify(profile.assistiveTechNeeded)}
    `;

    // Flag student as CWSN
    await this.prisma.$executeRaw`UPDATE students SET is_cwsn = true WHERE id = ${studentId}`;
  }

  // ── IEP Creation ──────────────────────────────────────────────────────────

  async createIep(schoolId: string, iep: {
    studentId: string;
    academicYearId: string;
    teacherId: string;
    counsellorId?: string;
    specialEducatorId: string;
    goals: IepGoal[];
    accommodations: string[];
    supportRequired: string;
    meetingDate: Date;
    parentSignedAt?: Date;
  }): Promise<string> {
    const iepId = `IEP-${studentId}-${Date.now()}`.replace("IEP-", "IEP-");
    const { studentId } = iep;

    await this.prisma.$executeRaw`
      INSERT INTO iep_plans (
        id, school_id, student_id, academic_year_id, teacher_id, counsellor_id,
        special_educator_id, goals, accommodations, support_required, meeting_date,
        parent_signed_at, review_status, created_at
      )
      VALUES (
        ${iepId}, ${schoolId}, ${studentId}, ${iep.academicYearId}, ${iep.teacherId},
        ${iep.counsellorId ?? null}, ${iep.specialEducatorId}, ${JSON.stringify(iep.goals)},
        ${JSON.stringify(iep.accommodations)}, ${iep.supportRequired}, ${iep.meetingDate},
        ${iep.parentSignedAt ?? null}, 'ACTIVE', NOW()
      )
    `;

    this.logger.log(`IEP created for student ${studentId}: ${iepId}`);
    return iepId;
  }

  async recordParentSignOff(iepId: string, signedAt: Date): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE iep_plans SET parent_signed_at = ${signedAt} WHERE id = ${iepId}
    `;
  }

  // ── IEP Review Cycle ──────────────────────────────────────────────────────

  async conductTermReview(iepId: string, review: {
    reviewerId: string;
    termId: string;
    goalProgressUpdates: { goalIndex: number; currentLevel: string; progressNotes: string; status: "ON_TRACK" | "DELAYED" | "ACHIEVED" }[];
    overallProgress: "EXCELLENT" | "GOOD" | "SATISFACTORY" | "NEEDS_SUPPORT";
    nextTermTargets: string;
    parentSignedAt?: Date;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO iep_reviews (iep_id, reviewer_id, term_id, goal_progress, overall_progress,
                                next_term_targets, parent_signed_at, reviewed_at)
      VALUES (${iepId}, ${review.reviewerId}, ${review.termId}, ${JSON.stringify(review.goalProgressUpdates)},
              ${review.overallProgress}, ${review.nextTermTargets}, ${review.parentSignedAt ?? null}, NOW())
    `;
  }

  // ── Exam Accommodations ───────────────────────────────────────────────────

  async setExamAccommodations(studentId: string, examId: string, accommodations: ExamAccommodation[]): Promise<void> {
    for (const acc of accommodations) {
      await this.prisma.$executeRaw`
        INSERT INTO exam_accommodations (student_id, exam_id, accommodation_type, details, board_approved, board_approval_no, created_at)
        VALUES (${studentId}, ${examId}, ${acc.type}, ${acc.details}, ${acc.boardApproved}, ${acc.boardApprovalNo ?? null}, NOW())
        ON CONFLICT (student_id, exam_id, accommodation_type) DO UPDATE
          SET details = ${acc.details}, board_approved = ${acc.boardApproved}
      `;
    }
  }

  async getStudentExamAccommodations(studentId: string, examId?: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT ea.*, e.name AS exam_name
      FROM exam_accommodations ea
      LEFT JOIN exams e ON e.id = ea.exam_id
      WHERE ea.student_id = ${studentId}
        AND (${examId ?? null} IS NULL OR ea.exam_id = ${examId ?? null})
    `;
  }

  // ── Special Educator Sessions ─────────────────────────────────────────────

  async logSession(schoolId: string, session: {
    specialEducatorId: string;
    studentId: string;
    iepId: string;
    date: Date;
    durationMinutes: number;
    focusArea: string;
    activitiesConducted: string;
    studentResponse: string;
    progressNotes: string;
    nextSessionPlan?: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO special_educator_sessions (
        school_id, special_educator_id, student_id, iep_id, date, duration_minutes,
        focus_area, activities_conducted, student_response, progress_notes, next_session_plan, created_at
      )
      VALUES (
        ${schoolId}, ${session.specialEducatorId}, ${session.studentId}, ${session.iepId},
        ${session.date}, ${session.durationMinutes}, ${session.focusArea}, ${session.activitiesConducted},
        ${session.studentResponse}, ${session.progressNotes}, ${session.nextSessionPlan ?? null}, NOW()
      )
    `;
  }

  // ── Government Compliance Report ──────────────────────────────────────────

  async getCwsnComplianceReport(schoolId: string, academicYearId: string): Promise<any> {
    return this.prisma.$queryRaw`
      SELECT
        cp.disability_type,
        COUNT(*) AS count,
        STRING_AGG(DISTINCT gb.benefit, ', ') AS benefits_provided
      FROM cwsn_profiles cp
      JOIN students s ON s.id = cp.student_id
      CROSS JOIN LATERAL jsonb_array_elements_text(cp.government_benefits::jsonb) AS gb(benefit)
      WHERE s.school_id = ${schoolId} AND s.status = 'ACTIVE'
      GROUP BY cp.disability_type
      ORDER BY count DESC
    `;
  }
}
