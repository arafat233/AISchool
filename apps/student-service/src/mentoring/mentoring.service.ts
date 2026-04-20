/**
 * Student Mentoring Program
 *
 * Senior-junior mentor matching (Gr 10–12 → junior),
 * Meeting logs, effectiveness tracking, mentor recognition.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MentoringService {
  private readonly logger = new Logger(MentoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  async assignMentor(schoolId: string, mentorStudentId: string, menteeStudentId: string, supervisorTeacherId: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO student_mentor_pairs (school_id, mentor_student_id, mentee_student_id, supervisor_teacher_id, active, assigned_at)
      VALUES (${schoolId}, ${mentorStudentId}, ${menteeStudentId}, ${supervisorTeacherId}, true, NOW())
      ON CONFLICT (mentor_student_id, mentee_student_id) DO UPDATE SET active = true, supervisor_teacher_id = ${supervisorTeacherId}
    `;
  }

  async logMeeting(schoolId: string, pairId: string, meeting: {
    date: Date;
    durationMinutes: number;
    focusArea: "ACADEMIC" | "SOCIAL" | "CAREER" | "EMOTIONAL";
    notes: string;
    menteeProgress: string;
    nextMeetingDate?: Date;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO mentor_meeting_logs (school_id, pair_id, meeting_date, duration_minutes,
        focus_area, notes, mentee_progress, next_meeting_date, created_at)
      VALUES (${schoolId}, ${pairId}, ${meeting.date}, ${meeting.durationMinutes},
              ${meeting.focusArea}, ${meeting.notes}, ${meeting.menteeProgress},
              ${meeting.nextMeetingDate ?? null}, NOW())
    `;
  }

  async getMentoringEffectivenessReport(schoolId: string, academicYearId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT
        mentor.full_name AS mentor_name,
        mentee.full_name AS mentee_name,
        COUNT(ml.id) AS meetings_conducted,
        AVG(er.percentage) FILTER (WHERE e.academic_year_id = ${academicYearId}) AS current_avg,
        AVG(er_prev.percentage) FILTER (WHERE e_prev.academic_year_id != ${academicYearId}) AS prev_avg,
        AVG(er.percentage) - AVG(er_prev.percentage) AS improvement
      FROM student_mentor_pairs mp
      JOIN students mentor ON mentor.id = mp.mentor_student_id
      JOIN students mentee ON mentee.id = mp.mentee_student_id
      LEFT JOIN mentor_meeting_logs ml ON ml.pair_id = mp.id
      LEFT JOIN exam_results er ON er.student_id = mp.mentee_student_id
      LEFT JOIN exams e ON e.id = er.exam_id AND e.academic_year_id = ${academicYearId}
      LEFT JOIN exam_results er_prev ON er_prev.student_id = mp.mentee_student_id
      LEFT JOIN exams e_prev ON e_prev.id = er_prev.exam_id AND e_prev.academic_year_id != ${academicYearId}
      WHERE mp.school_id = ${schoolId}
      GROUP BY mentor.full_name, mentee.full_name
    `;
  }

  async recogniseMentor(schoolId: string, mentorStudentId: string, academicYearId: string): Promise<void> {
    // Add portfolio achievement + gamification points
    await this.prisma.$executeRaw`
      INSERT INTO student_portfolio (student_id, title, description, category, term_id, created_at)
      SELECT ${mentorStudentId}, 'Peer Mentor', 'Recognised as a peer mentor for academic year ${academicYearId}',
             'COMMUNITY', t.id, NOW()
      FROM terms t WHERE t.academic_year_id = ${academicYearId} ORDER BY t.start_date LIMIT 1
    `;
    await this.prisma.$executeRaw`
      INSERT INTO gamification_points (school_id, student_id, action, category, points, awarded_at)
      VALUES (${schoolId}, ${mentorStudentId}, 'COMMUNITY_SERVICE', 'SERVICE', 200, NOW())
    `;
  }
}
