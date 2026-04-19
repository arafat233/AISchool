/**
 * Plagiarism service — wraps queue enqueuing and result retrieval.
 */
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { enqueuePlagiarismScan, PlagiarismJob } from "./plagiarism.queue";

@Injectable()
export class PlagiarismService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueueScan(dto: PlagiarismJob & { isPreSubmissionCheck?: boolean }): Promise<void> {
    await enqueuePlagiarismScan({
      submissionId: dto.submissionId,
      assignmentId: dto.assignmentId,
      studentId: dto.studentId,
      schoolId: dto.schoolId,
      submissionText: dto.submissionText,
      isPreSubmissionCheck: dto.isPreSubmissionCheck ?? false,
    });
  }

  async getPreCheckResult(submissionId: string) {
    const row = await this.prisma.$queryRaw<any[]>`
      SELECT overall_similarity_pct, verdict, scanned_at
      FROM plagiarism_results
      WHERE submission_id = ${submissionId} AND is_pre_submission = true
      ORDER BY scanned_at DESC LIMIT 1
    `;
    if (!row.length) return { status: "PENDING" };
    return {
      status: "READY",
      similarityPct: Number(row[0].overall_similarity_pct),
      verdict: row[0].verdict,
      scannedAt: row[0].scanned_at,
      // Deterrent message shown to student
      message: Number(row[0].overall_similarity_pct) >= 40
        ? "⚠️ Your draft has high similarity to other submissions. Please revise before final submission."
        : "✅ Your draft looks original. You can proceed to submit.",
    };
  }

  async getResult(submissionId: string) {
    const row = await this.prisma.$queryRaw<any[]>`
      SELECT pr.*, s.full_name AS student_name
      FROM plagiarism_results pr
      JOIN students s ON s.id = pr.student_id
      WHERE pr.submission_id = ${submissionId}
      ORDER BY pr.scanned_at DESC LIMIT 1
    `;
    return row[0] ?? null;
  }

  async getClassReport(assignmentId: string) {
    return this.prisma.$queryRaw<any[]>`
      SELECT
        pr.submission_id,
        pr.student_id,
        s.full_name,
        pr.overall_similarity_pct,
        pr.verdict,
        pr.matches_json,
        pr.scanned_at
      FROM plagiarism_results pr
      JOIN students s ON s.id = pr.student_id
      WHERE pr.assignment_id = ${assignmentId}
        AND pr.is_pre_submission = false
      ORDER BY pr.overall_similarity_pct DESC
    `;
  }

  async getTrendReport(params: { schoolId: string; classId?: string; termId?: string }) {
    // Plagiarism trend: avg similarity + flag count per class per term
    return this.prisma.$queryRaw<any[]>`
      SELECT
        cl.name AS class_name,
        t.name AS term_name,
        COUNT(pr.submission_id) AS total_submissions,
        ROUND(AVG(pr.overall_similarity_pct)::NUMERIC, 1) AS avg_similarity_pct,
        COUNT(*) FILTER (WHERE pr.overall_similarity_pct >= 70) AS high_plagiarism_count,
        COUNT(*) FILTER (WHERE pr.overall_similarity_pct >= 40 AND pr.overall_similarity_pct < 70) AS moderate_count,
        COUNT(*) FILTER (WHERE pr.overall_similarity_pct < 40) AS clean_count
      FROM plagiarism_results pr
      JOIN assignment_submissions asub ON asub.id = pr.submission_id
      JOIN assignments a ON a.id = asub.assignment_id
      JOIN classes cl ON cl.id = a.class_id
      JOIN academic_terms t ON t.id = a.term_id
      JOIN students s ON s.id = pr.student_id
      WHERE s.school_id = ${params.schoolId}
        ${params.classId ? this.prisma.$queryRaw`AND cl.id = ${params.classId}` : this.prisma.$queryRaw``}
        ${params.termId ? this.prisma.$queryRaw`AND t.id = ${params.termId}` : this.prisma.$queryRaw``}
        AND pr.is_pre_submission = false
      GROUP BY cl.name, t.name
      ORDER BY t.name, avg_similarity_pct DESC
    `;
  }
}
