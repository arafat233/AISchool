/**
 * BullMQ worker — processes RAG_INGEST jobs.
 * Reconstructs the file from the base64 payload and forwards it to the
 * ai-service /rag/ingest endpoint as a multipart upload.
 * The ai-service handles chunking, embedding, and DB persistence.
 */
import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import axios from "axios";
import FormData from "form-data";
import { QUEUES } from "@school-erp/events";
import type { RagIngestJob } from "./rag.queue";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://ai-service:8000";
const AI_SERVICE_KEY = process.env.AI_SERVICE_API_KEY ?? "";

const logger = {
  log: (msg: string) => console.log(`[RagIngestWorker] ${msg}`),
  error: (msg: string) => console.error(`[RagIngestWorker] ${msg}`),
};

export function startRagIngestWorker(): Worker {
  const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    QUEUES.RAG_INGEST,
    async (job: Job<RagIngestJob>) => {
      const { documentId, schoolId, tenantId, fileName, mimeType, docType, fileBase64 } = job.data;
      logger.log(`Ingesting document ${documentId} (${fileName})`);

      const fileBuffer = Buffer.from(fileBase64, "base64");

      const form = new FormData();
      form.append("document_id", documentId);
      form.append("school_id", schoolId);
      form.append("tenant_id", tenantId);
      form.append("doc_type", docType);
      form.append("file", fileBuffer, { filename: fileName, contentType: mimeType });

      const res = await axios.post(`${AI_SERVICE_URL}/rag/ingest`, form, {
        headers: {
          ...form.getHeaders(),
          "X-AI-Service-Key": AI_SERVICE_KEY,
        },
        timeout: 120_000,  // 2 min — large PDFs can take time to embed
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      logger.log(
        `Document ${documentId} ready — ${res.data.chunks_created} chunks`
      );
    },
    { connection, concurrency: 3 }
  );

  worker.on("failed", (job, err) => {
    logger.error(`Job ${job?.id} (doc ${job?.data?.documentId}) failed: ${err.message}`);
  });

  return worker;
}
