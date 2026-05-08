/**
 * RAG document management — creates / lists / deletes KnowledgeDocument records
 * and enqueues ingest jobs.  Chat and query calls go directly to ai-service
 * from the frontend via the API gateway.
 */
import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { enqueueRagIngest } from "./rag.queue";

export interface UploadDocumentInput {
  schoolId: string;
  tenantId: string;
  uploadedBy: string;
  docType: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileBase64: string;
}

@Injectable()
export class RagService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadDocument(input: UploadDocumentInput) {
    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        tenantId: input.tenantId,
        schoolId: input.schoolId,
        docType: input.docType as any,
        title: input.title,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        status: "PENDING",
        uploadedBy: input.uploadedBy,
      },
    });

    await enqueueRagIngest({
      documentId: doc.id,
      schoolId: input.schoolId,
      tenantId: input.tenantId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      docType: input.docType,
      fileBase64: input.fileBase64,
    });

    return { documentId: doc.id, status: "PENDING", title: doc.title };
  }

  async listDocuments(schoolId: string, docType?: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: { schoolId, ...(docType ? { docType: docType as any } : {}) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        fileName: true,
        docType: true,
        status: true,
        chunkCount: true,
        fileSizeBytes: true,
        uploadedBy: true,
        errorMsg: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getDocument(id: string, schoolId: string) {
    const doc = await this.prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Document not found");
    if (doc.schoolId !== schoolId) throw new ForbiddenException();
    return doc;
  }

  async deleteDocument(id: string, schoolId: string) {
    const doc = await this.prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Document not found");
    if (doc.schoolId !== schoolId) throw new ForbiddenException();

    // Cascade deletes knowledge_chunks via Prisma relation
    await this.prisma.knowledgeDocument.delete({ where: { id } });
    return { deleted: true };
  }

  async retryIngest(id: string, schoolId: string) {
    const doc = await this.getDocument(id, schoolId);
    if (doc.status !== "FAILED") {
      return { queued: false, reason: "Document is not in FAILED status" };
    }

    await this.prisma.knowledgeDocument.update({
      where: { id },
      data: { status: "PENDING", errorMsg: null },
    });

    // We don't have the original file anymore — caller must re-upload
    return { queued: false, reason: "Re-upload required — original file is not retained" };
  }
}
