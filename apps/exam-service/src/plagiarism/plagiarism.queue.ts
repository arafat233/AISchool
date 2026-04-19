/**
 * BullMQ queue definition for asynchronous plagiarism scanning.
 * Triggered when a student submits an assignment.
 */
import { Queue } from "bullmq";
import Redis from "ioredis";

export const PLAGIARISM_QUEUE = "plagiarism-scan";

export interface PlagiarismJob {
  submissionId: string;
  assignmentId: string;
  studentId: string;
  schoolId: string;
  submissionText: string;
  isPreSubmissionCheck: boolean;  // true = student preview check (no alert sent)
}

let queue: Queue | null = null;

export function getPlagiarismQueue(): Queue {
  if (!queue) {
    const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
    queue = new Queue(PLAGIARISM_QUEUE, { connection });
  }
  return queue;
}

export async function enqueuePlagiarismScan(job: PlagiarismJob): Promise<void> {
  await getPlagiarismQueue().add("scan", job, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 86400 },  // keep 24h
    removeOnFail: { age: 604800 },      // keep 7d on failure
  });
}
