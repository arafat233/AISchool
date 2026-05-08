/**
 * BullMQ queue for asynchronous RAG document ingestion.
 * Job data carries base64-encoded file content so no shared filesystem
 * is required between the academic-service and ai-service containers.
 * Practical file-size ceiling: ~8 MB (PDF/DOCX) — fits comfortably in Redis.
 */
import { Queue } from "bullmq";
import Redis from "ioredis";
import { QUEUES } from "@school-erp/events";

export interface RagIngestJob {
  documentId: string;
  schoolId: string;
  tenantId: string;
  fileName: string;
  mimeType: string;
  docType: string;
  fileBase64: string;   // base64-encoded raw file bytes
}

let queue: Queue | null = null;

export function getRagIngestQueue(): Queue {
  if (!queue) {
    const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
    connection.on("error", (err) =>
      process.stderr.write(`[RagIngestQueue] Redis error: ${err.message}\n`)
    );
    queue = new Queue(QUEUES.RAG_INGEST, { connection });
    queue.on("error", (err) =>
      process.stderr.write(`[RagIngestQueue] Queue error: ${err.message}\n`)
    );
  }
  return queue;
}

export async function enqueueRagIngest(job: RagIngestJob): Promise<void> {
  await getRagIngestQueue().add("ingest", job, {
    attempts: 3,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: { age: 3_600 },    // 1 h
    removeOnFail: { age: 604_800 },       // 7 d
  });
}
