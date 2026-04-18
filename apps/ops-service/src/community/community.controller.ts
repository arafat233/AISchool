import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CommunityService } from "./community.service";

@UseGuards(AuthGuard("jwt"))
@Controller("community")
export class CommunityController {
  constructor(private readonly svc: CommunityService) {}

  // PTA
  @Post(":schoolId/pta/members")
  addPtaMember(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.addPtaMember(schoolId, { ...body, electedAt: new Date(body.electedAt), tenureEndAt: body.tenureEndAt ? new Date(body.tenureEndAt) : undefined });
  }

  @Get(":schoolId/pta/members")
  getPtaCommittee(@Param("schoolId") schoolId: string) {
    return this.svc.getPtaCommittee(schoolId);
  }

  @Post(":schoolId/pta/meetings")
  createMeeting(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.createPtaMeeting(schoolId, body.createdBy, { ...body, meetingDate: new Date(body.meetingDate) });
  }

  @Patch("pta/meetings/:meetingId")
  updateMeeting(@Param("meetingId") meetingId: string, @Body() body: any) {
    return this.svc.updatePtaMeeting(meetingId, body);
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
  recordFundEntry(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.recordPtaFundEntry(schoolId, { ...body, entryDate: new Date(body.entryDate) });
  }

  @Get(":schoolId/pta/fund/balance")
  getFundBalance(@Param("schoolId") schoolId: string) {
    return this.svc.getPtaFundBalance(schoolId);
  }

  @Get(":schoolId/pta/meetings")
  getMeetings(@Param("schoolId") schoolId: string) {
    return this.svc.getPtaMeetings(schoolId);
  }

  // Volunteers
  @Post(":schoolId/volunteers/register")
  registerVolunteer(@Param("schoolId") schoolId: string, @Body() body: { parentId: string; skills: string[] }) {
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
  createOpportunity(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.createVolunteerOpportunity(schoolId, body.createdBy, { ...body, opportunityDate: new Date(body.opportunityDate) });
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
  getVolunteers(@Param("schoolId") schoolId: string) {
    return this.svc.getVolunteers(schoolId);
  }

  // Community service
  @Post(":schoolId/community-service")
  logService(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.logCommunityService(schoolId, { ...body, activityDate: new Date(body.activityDate) });
  }

  @Patch("community-service/:logId/validate")
  validateService(@Param("logId") logId: string, @Body() body: { validatedBy: string; certificateUrl?: string }) {
    return this.svc.validateCommunityService(logId, body.validatedBy, body.certificateUrl);
  }

  @Get(":schoolId/community-service/:studentId")
  getStudentHours(@Param("schoolId") schoolId: string, @Param("studentId") studentId: string) {
    return this.svc.getStudentCommunityHours(schoolId, studentId);
  }

  // Corporate Partners
  @Post(":schoolId/partners")
  createPartner(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.createPartner(schoolId, { ...body, mouStartDate: body.mouStartDate ? new Date(body.mouStartDate) : undefined, mouEndDate: body.mouEndDate ? new Date(body.mouEndDate) : undefined });
  }

  @Post("partners/:partnerId/csr-activities")
  logCsrActivity(@Param("partnerId") partnerId: string, @Body() body: any) {
    return this.svc.logCsrActivity(partnerId, { ...body, activityDate: new Date(body.activityDate) });
  }

  @Get("partners/:partnerId/utilisation-report")
  getCsrReport(@Param("partnerId") partnerId: string) {
    return this.svc.getCsrUtilisationReport(partnerId);
  }

  @Get(":schoolId/partners")
  getPartners(@Param("schoolId") schoolId: string) {
    return this.svc.getPartners(schoolId);
  }

  // Lost & Found
  @Post(":schoolId/lost-found")
  logFoundItem(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.logFoundItem(schoolId, body.reportedBy, { ...body, foundAt: new Date(body.foundAt) });
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
  getUnclaimed(@Param("schoolId") schoolId: string) {
    return this.svc.getUnclaimedItems(schoolId);
  }

  // Store
  @Post(":schoolId/store/products")
  createProduct(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.createProduct(schoolId, body);
  }

  @Patch("store/products/:productId/stock")
  updateStock(@Param("productId") productId: string, @Body() body: { delta: number }) {
    return this.svc.updateStock(productId, body.delta);
  }

  @Post(":schoolId/store/orders")
  placeOrder(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.placeOrder(schoolId, body);
  }

  @Get(":schoolId/store/products")
  getProducts(@Param("schoolId") schoolId: string, @Query("category") category?: string) {
    return this.svc.getProducts(schoolId, category);
  }

  @Get(":schoolId/store/low-stock")
  getLowStock(@Param("schoolId") schoolId: string) {
    return this.svc.getLowStockAlerts(schoolId);
  }

  // Robo calls
  @Post(":schoolId/robo-calls/templates")
  createTemplate(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.createCallTemplate(schoolId, body);
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
  createSignage(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.createSignageContent(schoolId, body.createdBy, { ...body, startAt: new Date(body.startAt), endAt: new Date(body.endAt) });
  }

  @Post(":schoolId/signage/emergency")
  emergencyBroadcast(@Param("schoolId") schoolId: string, @Body() body: { createdBy: string; message: string }) {
    return this.svc.emergencyOverrideAllScreens(schoolId, body.createdBy, body.message);
  }

  @Get(":schoolId/signage/active")
  getActiveSignage(@Param("schoolId") schoolId: string, @Query("screenId") screenId?: string) {
    return this.svc.getActiveSignageContent(schoolId, screenId);
  }
}
