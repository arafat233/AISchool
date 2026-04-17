import {
  Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { CertificateService } from "./certificate.service";

// Public controller for verification (no auth)
@Controller("verify")
export class VerifyController {
  constructor(private readonly svc: CertificateService) {}

  @Get(":certNo")
  verify(@Param("certNo") certNo: string) {
    return this.svc.verifyCertificate(certNo);
  }
}

@UseGuards(AuthGuard("jwt"))
@Controller("certificates")
export class CertificateController {
  constructor(private readonly svc: CertificateService) {}

  // ─── Templates ────────────────────────────────────────────────────────────────

  @Post("templates")
  createTemplate(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.createTemplate(req.user.schoolId!, body);
  }

  @Put("templates/:id")
  updateTemplate(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateTemplate(id, body);
  }

  @Get("templates")
  getTemplates(@Req() req: Request & { user: RequestUser }, @Query("type") type?: string) {
    return this.svc.getTemplates(req.user.schoolId!, type);
  }

  // ─── Requests ─────────────────────────────────────────────────────────────────

  @Post("requests")
  createRequest(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.createRequest({ schoolId: req.user.schoolId!, requestedBy: req.user.id, ...body });
  }

  @Get("requests")
  getRequests(@Req() req: Request & { user: RequestUser }, @Query("status") status?: string, @Query("type") type?: string) {
    return this.svc.getRequests(req.user.schoolId!, { status, certificateType: type });
  }

  @Post("requests/:id/approve")
  approve(@Req() req: Request & { user: RequestUser }, @Param("id") id: string) {
    return this.svc.approveRequest(id, req.user.id);
  }

  @Post("requests/:id/reject")
  reject(@Req() req: Request & { user: RequestUser }, @Param("id") id: string, @Body("reason") reason?: string) {
    return this.svc.rejectRequest(id, req.user.id, reason);
  }

  // ─── Issue ────────────────────────────────────────────────────────────────────

  @Post("issue")
  issue(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.issueCertificate({ issuedBy: req.user.id, schoolId: req.user.schoolId!, ...body });
  }

  // ─── HTML preview ─────────────────────────────────────────────────────────────

  @Get(":certNo/html")
  html(@Param("certNo") certNo: string) {
    return this.svc.generateCertificateHtml(certNo);
  }

  // ─── Revoke ───────────────────────────────────────────────────────────────────

  @Post(":certNo/revoke")
  revoke(@Req() req: Request & { user: RequestUser }, @Param("certNo") certNo: string, @Body("reason") reason?: string) {
    return this.svc.revokeCertificate(certNo, req.user.id, reason);
  }

  // ─── DigiLocker push ──────────────────────────────────────────────────────────

  @Post(":certNo/digilocker")
  pushDigiLocker(@Param("certNo") certNo: string) {
    return this.svc.pushToDigiLocker(certNo);
  }
}
