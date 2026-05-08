/**
 * RAG document management endpoints consumed by the admin portal.
 * Handles file upload, listing, and deletion for the knowledge base.
 *
 * POST  /rag/:schoolId/documents          — upload a document
 * GET   /rag/:schoolId/documents          — list documents (filterable by docType)
 * GET   /rag/:schoolId/documents/:id      — get single document status
 * DELETE /rag/:schoolId/documents/:id     — delete document + its chunks
 */
import {
  Controller, Delete, ForbiddenException, Get, Param, Post,
  Query, Req, UploadedFile, UseGuards, UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { RagService } from "./rag.service";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@UseGuards(AuthGuard("jwt"))
@Controller("rag")
export class RagController {
  constructor(private readonly svc: RagService) {}

  @Post(":schoolId/documents")
  @UseInterceptors(FileInterceptor("file"))
  async uploadDocument(
    @Param("schoolId") schoolId: string,
    @Req() req: Request & { user: RequestUser },
    @UploadedFile() file: Express.Multer.File,
    @Query("docType") docType = "GENERAL",
    @Query("title") title?: string,
  ) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    if (!file) throw new Error("No file uploaded");
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new Error("Only PDF, DOCX, and plain-text files are accepted");
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error("File exceeds the 10 MB limit");
    }

    return this.svc.uploadDocument({
      schoolId,
      tenantId: req.user.tenantId!,
      uploadedBy: req.user.id,
      docType,
      title: title ?? file.originalname,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      fileBase64: file.buffer.toString("base64"),
    });
  }

  @Get(":schoolId/documents")
  listDocuments(
    @Param("schoolId") schoolId: string,
    @Req() req: Request & { user: RequestUser },
    @Query("docType") docType?: string,
  ) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.listDocuments(schoolId, docType);
  }

  @Get(":schoolId/documents/:id")
  getDocument(
    @Param("schoolId") schoolId: string,
    @Param("id") id: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getDocument(id, schoolId);
  }

  @Delete(":schoolId/documents/:id")
  deleteDocument(
    @Param("schoolId") schoolId: string,
    @Param("id") id: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.deleteDocument(id, schoolId);
  }
}
