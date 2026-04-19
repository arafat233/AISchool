/**
 * BullMQ worker — processes plagiarism scan jobs from the queue.
 *
 * Flow:
 *  1. Calls AI service POST /plagiarism/check
 *  2. Persists result to DB (assignment_plagiarism_results)
 *  3. If score > threshold → adds to teacher_review_queue (notification)
 *  4. If pre-submission check → stores result keyed by submissionId for student to fetch
 */
import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { PLAGIARISM_QUEUE, PlagiarismJob } from "./plagiarism.queue";

const prisma = new PrismaClient();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://ai-service:8000";
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL ?? "http://notification-service:3007";

// Flag for teacher review if similarity exceeds this threshold
const TEACHER_REVIEW_THRESHOLD = 40;   // %
const HIGH_PLAGIARISM_THRESHOLD = 70;  // %

export function startPlagiarismWorker(): Worker {
  const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    PLAGIARISM_QUEUE,
    async (job: Job<PlagiarismJob>) => {
      const data = job.data;
      console.log(`[plagiarism-worker] Scanning submission ${data.submissionId}`);

      // ── 1. Call AI service ────────────────────────────────────────────────
      let result: {
        overall_similarity_pct: number;
        verdict: string;
        matches: Array<{ comparison_student_id: string; comparison_name: string; similarity_pct: number }>;
        word_count: number;
        unique_phrases: number;
      };

      try {
        const res = await axios.post(`${AI_SERVICE_URL}/plagiarism/check`, {
          assignment_id: data.assignmentId,
          student_id: data.studentId,
          submission_text: data.submissionText,
        }, { timeout: 30000 });
        result = res.data;
      } catch (err: any) {
        throw new Error(`AI service call failed: ${err.message}`);
      }

      // ── 2. Persist result ─────────────────────────────────────────────────
      await prisma.$executeRaw`
        INSERT INTO plagiarism_results (
          submission_id, assignment_id, student_id, school_id,
          overall_similarity_pct, verdict, matches_json,
          word_count, unique_phrases, is_pre_submission, scanned_at
        ) VALUES (
          ${data.submissionId}, ${data.assignmentId}, ${data.studentId}, ${data.schoolId},
          ${result.overall_similarity_pct}, ${result.verdict}, ${JSON.stringify(result.matches)}::jsonb,
          ${result.word_count}, ${result.unique_phrases}, ${data.isPreSubmissionCheck},
          NOW()
        )
        ON CONFLICT (submission_id) DO UPDATE SET
          overall_similarity_pct = EXCLUDED.overall_similarity_pct,
          verdict = EXCLUDED.verdict,
          matches_json = EXCLUDED.matches_json,
          scanned_at = NOW()
      `;

      // ── 3. Notify teacher if threshold exceeded (real submission only) ────
      if (!data.isPreSubmissionCheck && result.overall_similarity_pct >= TEACHER_REVIEW_THRESHOLD) {
        await notifyTeacherReview(data, result.overall_similarity_pct, result.verdict);
      }

      console.log(
        `[plagiarism-worker] Done — ${data.submissionId}: ${result.overall_similarity_pct}% (${result.verdict})`
      );
    },
    { connection, concurrency: 5 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[plagiarism-worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

async function notifyTeacherReview(
  data: PlagiarismJob,
  similarity: number,
  verdict: string
): Promise<void> {
  try {
    const severity = similarity >= HIGH_PLAGIARISM_THRESHOLD ? "HIGH" : "MEDIUM";
    await axios.post(`${NOTIFICATION_SERVICE_URL}/internal/alert`, {
      type: "PLAGIARISM_DETECTED",
      schoolId: data.schoolId,
      title: `Plagiarism Alert — ${verdict.replace("_", " ")} (${similarity}%)`,
      body: `Assignment submission by student ${data.studentId} has ${similarity}% similarity. Please review before finalizing grades.`,
      recipients: ["TEACHER"],
      relatedEntityType: "ASSIGNMENT",
      relatedEntityId: data.assignmentId,
      severity,
      metadata: { submissionId: data.submissionId, similarity, verdict },
    });
  } catch {
    // Non-critical
  }
}
