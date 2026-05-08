import { Controller, ForbiddenException, Get, Post, Patch, Param, Query, Body, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { CommunityService } from "./community.service";
import {
  AddPtaMemberDto, CreatePtaMeetingDto, UpdatePtaMeetingDto, RecordPtaFundEntryDto,
  CreateVolunteerOpportunityDto, LogCommunityServiceDto, CreatePartnerDto, LogCsrActivityDto,
  LogFoundItemDto, CreateProductDto, PlaceOrderDto, CreateCallTemplateDto, CreateSignageContentDto,
} from "./dto/community.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("community")
export class CommunityController {
  constructor(private readonly svc: CommunityService) {}

  // PTA
  @Post(":schoolId/pta/members")
  addPtaMember(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() dto: AddPtaMemberDto) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.addPtaMember(schoolId, { ...dto, electedAt: new Date(dto.electedAt), tenureEndAt: dto.tenureEndAt ? new Date(dto.tenureEndAt) : undefined });
  }

  @Get(":schoolId/pta/members")
  getPtaCommittee(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getPtaCommittee(schoolId);
  }

  @Post(":schoolId/pta/meetings")
  createMeeting(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() dto: CreatePtaMeetingDto) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.createPtaMeeting(schoolId, dto.createdBy, { ...dto, meetingDate: new Date(dto.meetingDate) });
  }

  @Patch("pta/meetings/:meetingId")
  updateMeeting(@Param("meetingId") meetingId: string, @Body() dto: UpdatePtaMeetingDto) {
    return this.svc.updatePtaMeeting(meetingId, dto);
  }

  @Post("pta/meetings/:meetingId/votes")
  addVote(@Param("meetingId") meetingId: string, @Body() body: { topic: string }) {
    return this.svc.addPtaVote(meetingId, body.topic);
  }

  @Post("pta/votes/:voteId/cast")
  castVote(@Param("voteId") voteId: string, @Body() body: { decision: "YES" | "NO" | "ABSTAIN" }) {
    return this.svc.castPtaVote(voteId, body.decision);
  }

  @Patch("pta/votes/:voteId/close")
  closeVote(@Param("voteId") voteId: string) {
    return this.svc.closePtaVote(voteId);
  }

  @Post(":schoolId/pta/fund")
  recordFundEntry(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() dto: RecordPtaFundEntryDto) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.recordPtaFundEntry(schoolId, { ...dto, entryDate: new Date(dto.entryDate) });
  }

  @Get(":schoolId/pta/fund/balance")
  getFundBalance(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getPtaFundBalance(schoolId);
  }

  @Get(":schoolId/pta/meetings")
  getMeetings(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getPtaMeetings(schoolId);
  }

  // Volunteers
  @Post(":schoolId/volunteers/register")
  registerVolunteer(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() body: { parentId: string; skills: string[] }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.registerVolunteer(schoolId, body.parentId, body.skills);
  }

  @Patch("volunteers/:volunteerId/approve")
  approveVolunteer(@Param("volunteerId") volunteerId: string, @Body() body: { approvedBy: string }) {
    return this.svc.approveVolunteer(volunteerId, body.approvedBy);
  }

  @Patch("volunteers/:volunteerId/background-check")
  setBackgroundCheck(@Param("volunteerId") volunteerId: string, @Body() body: { status: "CLEARED" | "FAILED" }) {
    return this.svc.setBackgroundCheck(volunteerId, body.status);
  }

  @Post(":schoolId/volunteers/opportunities")
  createOpportunity(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() dto: CreateVolunteerOpportunityDto) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.createVolunteerOpportunity(schoolId, dto.createdBy, { ...dto, opportunityDate: new Date(dto.opportunityDate) });
  }

  @Post("volunteers/opportunities/:opportunityId/apply")
  applyForOpportunity(@Param("opportunityId") opportunityId: string, @Body() body: { volunteerId: string }) {
    return this.svc.applyForOpportunity(opportunityId, body.volunteerId);
  }

  @Patch("volunteers/:volunteerId/log-hours")
  logHours(@Param("volunteerId") volunteerId: string, @Body() body: { hours: number }) {
    return this.svc.logVolunteerHours(volunteerId, body.hours);
  }

  @Get(":schoolId/volunteers")
  getVolunteers(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getVolunteers(schoolId);
  }

  // Community service
  @Post(":schoolId/community-service")
  logService(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() dto: LogCommunityServiceDto) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.logCommunityService(schoolId, { ...dto, activityDate: new Date(dto.activityDate) });
  }

  @Patch("community-service/:logId/validate")
  validateService(@Param("logId") logId: string, @Body() body: { validatedBy: string; certificateUrl?: string }) {
    return this.svc.validateCommunityService(logId, body.validatedBy, body.certificateUrl);
  }

  @Get(":schoolId/community-service/:studentId")
  getStudentHours(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Param("studentId") studentId: string) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getStudentCommunityHours(schoolId, studentId);
  }

  // Corporate Partners
  @Post(":schoolId/partners")
  createPartner(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() dto: CreatePartnerDto) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.createPartner(schoolId, { ...dto, mouStartDate: dto.mouStartDate ? new Date(dto.mouStartDate) : undefined, mouEndDate: dto.mouEndDate ? new Date(dto.mouEndDate) : undefined });
  }

  @Post("partners/:partnerId/csr-activities")
  logCsrActivity(@Param("partnerId") partnerId: string, @Body() dto: LogCsrActivityDto) {
    return this.svc.logCsrActivity(partnerId, { ...dto, activityDate: new Date(dto.activityDate) });
  }

  @Get("partners/:partnerId/utilisation-report")
  getCsrReport(@Param("partnerId") partnerId: string) {
    return this.svc.getCsrUtilisationReport(partnerId);
  }

  @Get(":schoolId/partners")
  getPartners(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getPartners(schoolId);
  }

  // Lost & Found
  @Post(":schoolId/lost-found")
  logFoundItem(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() dto: LogFoundItemDto) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.logFoundItem(schoolId, dto.reportedBy, { ...dto, foundAt: new Date(dto.foundAt) });
  }

  @Patch("lost-found/:itemId/claim")
  claimItem(@Param("itemId") itemId: string, @Body() body: { claimantId: string }) {
    return this.svc.claimFoundItem(itemId, body.claimantId);
  }

  @Patch("lost-found/:itemId/dispose")
  disposeItem(@Param("itemId") itemId: string) {
    return this.svc.disposeFoundItem(itemId);
  }

  @Get(":schoolId/lost-found")
  getUnclaimed(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getUnclaimedItems(schoolId);
  }

  // Store
  @Post(":schoolId/store/products")
  createProduct(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() dto: CreateProductDto) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.createProduct(schoolId, dto);
  }

  @Patch("store/products/:productId/stock")
  updateStock(@Param("productId") productId: string, @Body() body: { delta: number }) {
    return this.svc.updateStock(productId, body.delta);
  }

  @Post(":schoolId/store/orders")
  placeOrder(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() dto: PlaceOrderDto) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.placeOrder(schoolId, dto);
  }

  @Get(":schoolId/store/products")
  getProducts(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Query("category") category?: string) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getProducts(schoolId, category);
  }

  @Get(":schoolId/store/low-stock")
  getLowStock(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getLowStockAlerts(schoolId);
  }

  // Robo calls
  @Post(":schoolId/robo-calls/templates")
  createTemplate(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() dto: CreateCallTemplateDto) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.createCallTemplate(schoolId, dto);
  }

  @Post("robo-calls/templates/:templateId/dispatch")
  dispatchCalls(@Param("templateId") templateId: string, @Body() body: { recipients: Array<{ recipientId: string; recipientPhone: string }> }) {
    return this.svc.dispatchCalls(templateId, body.recipients);
  }

  @Patch("robo-calls/logs/:logId/status")
  updateCallStatus(@Param("logId") logId: string, @Body() body: { status: "ANSWERED" | "NOT_ANSWERED" | "FAILED" }) {
    return this.svc.updateCallStatus(logId, body.status);
  }

  @Get("robo-calls/templates/:templateId/delivery-status")
  getDeliveryStatus(@Param("templateId") templateId: string) {
    return this.svc.getCallDeliveryStatus(templateId);
  }

  // Digital signage
  @Post(":schoolId/signage")
  createSignage(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() dto: CreateSignageContentDto) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.createSignageContent(schoolId, dto.createdBy, { ...dto, startAt: new Date(dto.startAt), endAt: new Date(dto.endAt) });
  }

  @Post(":schoolId/signage/emergency")
  emergencyBroadcast(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Body() body: { createdBy: string; message: string }) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.emergencyOverrideAllScreens(schoolId, body.createdBy, body.message);
  }

  @Get(":schoolId/signage/active")
  getActiveSignage(@Param("schoolId") schoolId: string, @Req() req: Request & { user: RequestUser }, @Query("screenId") screenId?: string) {
    if (schoolId !== req.user.schoolId) throw new ForbiddenException();
    return this.svc.getActiveSignageContent(schoolId, screenId);
  }
}
