import { Controller, ForbiddenException, Get, Post, Patch, Param, Query, Body, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { AlumniService } from "./alumni.service";
import { UpdateAlumniProfileDto } from "./dto/alumni.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("alumni")
export class AlumniController {
  constructor(private readonly svc: AlumniService) {}

  @Post(":schoolId/register/:studentId")
  register(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Param("studentId") studentId: string, @Body() body: { graduationYear: number }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.registerAlumni(schoolId, studentId, body.graduationYear);
  }

  @Post(":schoolId/invite/:studentId")
  invite(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Param("studentId") studentId: string, @Body() body: { graduationYear: number }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.inviteAlumni(schoolId, studentId, body.graduationYear);
  }

  @Patch(":alumniId/profile")
  updateProfile(@Param("alumniId") alumniId: string, @Body() dto: UpdateAlumniProfileDto) {
    return this.svc.updateAlumniProfile(alumniId, dto);
  }

  @Get(":schoolId/directory")
  searchDirectory(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Query("batchYear") batchYear?: string, @Query("city") city?: string, @Query("employer") employer?: string, @Query("industry") industry?: string) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.searchDirectory(schoolId, { batchYear: batchYear ? parseInt(batchYear) : undefined, city, employer, industry });
  }

  @Post(":schoolId/jobs")
  postJob(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() body: { alumniId: string; title: string; company: string; description?: string; location?: string; salaryRange?: string }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.postJob(schoolId, body.alumniId, body);
  }

  @Patch("jobs/:jobId/moderate")
  moderateJob(@Param("jobId") jobId: string, @Body() body: { moderatedBy: string; approve: boolean }) {
    return this.svc.moderateJob(jobId, body.moderatedBy, body.approve);
  }

  @Post("jobs/:jobId/apply")
  applyForJob(@Param("jobId") jobId: string, @Body() body: { applicantId: string; applicantType: "STUDENT" | "ALUMNI" }) {
    return this.svc.applyForJob(jobId, body.applicantId, body.applicantType);
  }

  @Get(":schoolId/jobs")
  getJobBoard(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Query("status") status?: string) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getJobBoard(schoolId, status);
  }

  @Post(":alumniId/placements")
  recordPlacement(@Param("alumniId") alumniId: string, @Body() body: { employer: string; industry?: string; salaryBand?: string; startYear: number }) {
    return this.svc.recordPlacement(alumniId, body);
  }

  @Get(":schoolId/placements/analytics")
  getPlacementAnalytics(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getPlacementAnalytics(schoolId);
  }

  @Post("mentor-links")
  requestMentoring(@Body() body: { mentorAlumniId: string; menteeStudentId: string }) {
    return this.svc.requestMentoring(body.mentorAlumniId, body.menteeStudentId);
  }

  @Patch("mentor-links/:linkId")
  updateMentorLink(@Param("linkId") linkId: string, @Body() body: { status?: string; sessionsCount?: number; notes?: string }) {
    return this.svc.updateMentorLink(linkId, body);
  }

  @Get(":schoolId/mentors")
  getMentors(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getMentors(schoolId);
  }

  @Post(":schoolId/campaigns")
  createCampaign(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() body: { title: string; description?: string; targetAmtRs: number; startDate: string; endDate: string }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.createCampaign(schoolId, { ...body, startDate: new Date(body.startDate), endDate: new Date(body.endDate) });
  }

  @Post("campaigns/:campaignId/donations")
  recordDonation(@Param("campaignId") campaignId: string, @Body() body: { donorId: string; donorType: string; amountRs: number; paymentRef?: string; notes?: string }) {
    return this.svc.recordDonation(campaignId, body);
  }

  @Get(":schoolId/campaigns")
  getCampaigns(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getCampaigns(schoolId);
  }

  @Get("campaigns/:campaignId/impact-report")
  getImpactReport(@Param("campaignId") campaignId: string) {
    return this.svc.getDonorImpactReport(campaignId);
  }

  // ─── Health ───────────────────────────────────────────────────────────────────

  @Get("health")
  health() { return { status: "ok", service: "ops-service" }; }
}
