import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { AdmissionService } from "./admission.service";

@UseGuards(AuthGuard("jwt"))
@Controller()
export class AdmissionController {
  constructor(private readonly svc: AdmissionService) {}

  // ─── Enquiries ────────────────────────────────────────────────────────────────

  @Post("enquiries")
  createEnquiry(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.createEnquiry(req.user.schoolId!, {
      ...body,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
    });
  }

  @Get("enquiries")
  getEnquiries(
    @Req() req: Request & { user: RequestUser },
    @Query("status") status?: string,
    @Query("source") source?: string,
  ) {
    return this.svc.getEnquiries(req.user.schoolId!, status, source);
  }

  @Get("enquiries/:id")
  getEnquiry(@Param("id") id: string) {
    return this.svc.getEnquiry(id);
  }

  @Patch("enquiries/:id")
  updateEnquiry(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateEnquiry(id, {
      ...body,
      nextFollowUpDate: body.nextFollowUpDate ? new Date(body.nextFollowUpDate) : undefined,
    });
  }

  @Post("enquiries/:id/follow-up")
  addFollowUp(
    @Req() req: Request & { user: RequestUser },
    @Param("id") enquiryId: string,
    @Body() body: any,
  ) {
    return this.svc.addFollowUp(enquiryId, {
      ...body,
      loggedBy: req.user.id,
      nextDate: body.nextDate ? new Date(body.nextDate) : undefined,
    });
  }

  // ─── Applications ─────────────────────────────────────────────────────────────

  @Post("applications")
  createApplication(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.createApplication(req.user.schoolId!, {
      ...body,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
    });
  }

  @Get("applications")
  getApplications(@Req() req: Request & { user: RequestUser }, @Query("status") status?: string) {
    return this.svc.getApplications(req.user.schoolId!, status);
  }

  @Get("applications/:id")
  getApplication(@Param("id") id: string) {
    return this.svc.getApplication(id);
  }

  @Patch("applications/:id/status")
  updateStatus(@Req() req: Request & { user: RequestUser }, @Param("id") id: string, @Body() body: any) {
    return this.svc.updateApplicationStatus(id, {
      ...body,
      reviewedBy: req.user.id,
      interviewDate: body.interviewDate ? new Date(body.interviewDate) : undefined,
      offerDate: body.offerDate ? new Date(body.offerDate) : undefined,
    });
  }

  @Post("applications/:id/documents")
  uploadDocument(@Param("id") id: string, @Body() body: { type: string; url: string }) {
    return this.svc.uploadDocument(id, body);
  }

  @Post("applications/:id/documents/:type/verify")
  verifyDocument(@Param("id") id: string, @Param("type") type: string) {
    return this.svc.verifyDocument(id, type);
  }

  @Post("applications/:id/ocr")
  ocrExtract(@Param("id") id: string, @Body("documentUrl") documentUrl: string) {
    return this.svc.ocrExtract(id, documentUrl);
  }

  @Post("applications/:id/confirm")
  confirmAdmission(@Param("id") id: string) {
    return this.svc.confirmAdmission(id);
  }

  // ─── RTE Quota ────────────────────────────────────────────────────────────────

  @Get("rte/quota")
  getRteQuota(@Req() req: Request & { user: RequestUser }, @Query("year") year: string) {
    return this.svc.getRteQuota(req.user.schoolId!, year);
  }

  @Post("rte/quota")
  setRteQuota(@Req() req: Request & { user: RequestUser }, @Body() body: { academicYear: string; totalSeats: number }) {
    return this.svc.setRteQuota(req.user.schoolId!, body.academicYear, body.totalSeats);
  }

  @Post("rte/lottery")
  runLottery(@Req() req: Request & { user: RequestUser }, @Body("academicYear") academicYear: string) {
    return this.svc.runRteLottery(req.user.schoolId!, academicYear);
  }

  // ─── Analytics ────────────────────────────────────────────────────────────────

  @Get("analytics/funnel")
  getFunnel(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getFunnelReport(req.user.schoolId!);
  }
}
