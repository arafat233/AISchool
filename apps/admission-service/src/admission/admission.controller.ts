import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { AdmissionService } from "./admission.service";
import { CreateEnquiryDto, UpdateEnquiryDto, AddFollowUpDto, CreateApplicationDto, UpdateApplicationStatusDto } from "./dto/admission.dto";

@UseGuards(AuthGuard("jwt"))
@Controller()
export class AdmissionController {
  constructor(private readonly svc: AdmissionService) {}

  // ─── Enquiries ────────────────────────────────────────────────────────────────

  @Post("enquiries")
  createEnquiry(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateEnquiryDto) {
    return this.svc.createEnquiry(req.user.schoolId!, {
      ...dto,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
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
  getEnquiry(@Param("id") id: string, @Req() req: Request & { user: RequestUser }) {
    return this.svc.getEnquiry(id, req.user.schoolId!);
  }

  @Patch("enquiries/:id")
  updateEnquiry(@Param("id") id: string, @Req() req: Request & { user: RequestUser }, @Body() dto: UpdateEnquiryDto) {
    return this.svc.updateEnquiry(id, req.user.schoolId!, {
      ...dto,
      nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : undefined,
    });
  }

  @Post("enquiries/:id/follow-up")
  addFollowUp(
    @Req() req: Request & { user: RequestUser },
    @Param("id") enquiryId: string,
    @Body() dto: AddFollowUpDto,
  ) {
    return this.svc.addFollowUp(enquiryId, {
      ...dto,
      loggedBy: req.user.id,
      nextDate: dto.nextDate ? new Date(dto.nextDate) : undefined,
    });
  }

  // ─── Applications ─────────────────────────────────────────────────────────────

  @Post("applications")
  createApplication(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateApplicationDto) {
    return this.svc.createApplication(req.user.schoolId!, {
      ...dto,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    });
  }

  @Get("applications")
  getApplications(@Req() req: Request & { user: RequestUser }, @Query("status") status?: string) {
    return this.svc.getApplications(req.user.schoolId!, status);
  }

  @Get("applications/:id")
  getApplication(@Param("id") id: string, @Req() req: Request & { user: RequestUser }) {
    return this.svc.getApplication(id, req.user.schoolId!);
  }

  @Patch("applications/:id/status")
  updateStatus(@Req() req: Request & { user: RequestUser }, @Param("id") id: string, @Body() dto: UpdateApplicationStatusDto) {
    return this.svc.updateApplicationStatus(id, req.user.schoolId!, {
      ...dto,
      reviewedBy: req.user.id,
      interviewDate: dto.interviewDate ? new Date(dto.interviewDate) : undefined,
      offerDate: dto.offerDate ? new Date(dto.offerDate) : undefined,
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

  // ─── Health ───────────────────────────────────────────────────────────────────

  @Get("health")
  health() { return { status: "ok", service: "admission-service" }; }
}
