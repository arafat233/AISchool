import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { EventService } from "./event.service";

@UseGuards(AuthGuard("jwt"))
@Controller("events")
export class EventController {
  constructor(private readonly svc: EventService) {}

  // ─── [1] Event CRUD ───────────────────────────────────────────────────────

  @Post(":schoolId")
  createEvent(
    @Param("schoolId") schoolId: string,
    @Body() body: { createdBy: string; title: string; type: string; startDate: string; endDate: string; description?: string; venue?: string; budgetRs?: number },
  ) {
    return this.svc.createEvent(schoolId, body.createdBy, { ...body, startDate: new Date(body.startDate), endDate: new Date(body.endDate) });
  }

  @Patch(":eventId")
  updateEvent(@Param("eventId") eventId: string, @Body() body: any) {
    return this.svc.updateEvent(eventId, body);
  }

  @Get(":schoolId")
  getEvents(
    @Param("schoolId") schoolId: string,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.svc.getEvents(schoolId, type, status, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  @Get("detail/:eventId")
  getEventById(@Param("eventId") eventId: string) {
    return this.svc.getEventById(eventId);
  }

  @Delete(":eventId")
  deleteEvent(@Param("eventId") eventId: string) {
    return this.svc.deleteEvent(eventId);
  }

  // ─── [2] Participant registration ─────────────────────────────────────────

  @Post(":eventId/participants")
  registerParticipant(@Param("eventId") eventId: string, @Body() body: { memberId: string; memberRole: string; consentGiven?: boolean; consentDocUrl?: string }) {
    return this.svc.registerParticipant(eventId, body);
  }

  @Patch(":eventId/participants/:memberId/checkin")
  checkInParticipant(@Param("eventId") eventId: string, @Param("memberId") memberId: string) {
    return this.svc.checkInParticipant(eventId, memberId);
  }

  @Get(":eventId/participants")
  getParticipants(@Param("eventId") eventId: string, @Query("role") role?: string) {
    return this.svc.getParticipants(eventId, role);
  }

  // ─── [3] Sports Day ───────────────────────────────────────────────────────

  @Post(":eventId/sports-day/init")
  initSportsDay(@Param("eventId") eventId: string) {
    return this.svc.initSportsDay(eventId);
  }

  @Post("sports-day/:configId/tracks")
  addSportsDayTrack(@Param("configId") configId: string, @Body() body: { name: string; category: string; ageGroup?: string; gender?: string }) {
    return this.svc.addSportsDayTrack(configId, body);
  }

  @Post("sports-day/tracks/:trackId/heats")
  createHeat(@Param("trackId") trackId: string, @Body() body: { round: string; heatNo: number }) {
    return this.svc.createHeat(trackId, body.round, body.heatNo);
  }

  @Post("sports-day/heats/:heatId/entries")
  addSportsEntry(@Param("heatId") heatId: string, @Body() body: { studentId: string; houseId?: string }) {
    return this.svc.addSportsEntry(heatId, body);
  }

  @Post("sports-day/heats/:heatId/results")
  recordSportsResult(@Param("heatId") heatId: string, @Body() body: { results: Array<{ studentId: string; timing: string; position: number }> }) {
    return this.svc.recordSportsResult(heatId, body.results);
  }

  @Post("sports-day/house-points")
  awardHousePoints(@Body() body: { houseId: string; configId?: string; category: string; points: number; awardedBy: string; reason?: string }) {
    return this.svc.awardHousePoints(body.houseId, body.configId, body.category, body.points, body.awardedBy, body.reason);
  }

  @Get(":schoolId/houses/leaderboard")
  getHouseLeaderboard(@Param("schoolId") schoolId: string) {
    return this.svc.getHouseLeaderboard(schoolId);
  }

  @Post("sports-day/:configId/declare-champion")
  declareChampionHouse(@Param("configId") configId: string) {
    return this.svc.declareChampionHouse(configId);
  }

  @Get("sports-day/:configId/medal-tally")
  getMedalTally(@Param("configId") configId: string) {
    return this.svc.getMedalTally(configId);
  }

  // ─── [4] Drama / Production ───────────────────────────────────────────────

  @Post(":eventId/drama/init")
  initDramaProduction(@Param("eventId") eventId: string, @Body() body: { productionTitle: string; totalSeats?: number }) {
    return this.svc.initDramaProduction(eventId, body.productionTitle, body.totalSeats);
  }

  @Post("drama/:configId/auditions")
  scheduleAudition(@Param("configId") configId: string, @Body() body: { studentId: string; role: string; scheduledAt: string; notes?: string }) {
    return this.svc.scheduleAudition(configId, { ...body, scheduledAt: new Date(body.scheduledAt) });
  }

  @Patch("drama/auditions/:auditionId/result")
  recordAuditionResult(@Param("auditionId") auditionId: string, @Body() body: { result: "SELECTED" | "WAITLISTED" | "REJECTED"; notes?: string }) {
    return this.svc.recordAuditionResult(auditionId, body.result, body.notes);
  }

  @Post("drama/:configId/rehearsals")
  scheduleRehearsal(@Param("configId") configId: string, @Body() body: { scheduledAt: string; venue?: string; attendees: string[]; notes?: string }) {
    return this.svc.scheduleRehearsal(configId, { ...body, scheduledAt: new Date(body.scheduledAt) });
  }

  @Post("drama/:configId/props")
  manageDramaProp(@Param("configId") configId: string, @Body() body: { name: string; category: string; quantity?: number; assignedTo?: string }) {
    return this.svc.manageDramaProp(configId, body);
  }

  @Patch("drama/props/:propId")
  updateDramaProp(@Param("propId") propId: string, @Body() body: any) {
    return this.svc.updateDramaProp(propId, body);
  }

  @Post("drama/:configId/tickets")
  bookDramaTicket(@Param("configId") configId: string, @Body() body: { bookedBy: string; seatNo?: string; priceRs?: number }) {
    return this.svc.bookDramaTicket(configId, body.bookedBy, body.seatNo, body.priceRs);
  }

  @Post("drama/tickets/checkin")
  checkInDramaTicket(@Body() body: { qrCode: string }) {
    return this.svc.checkInDramaTicket(body.qrCode);
  }

  @Get("drama/:configId")
  getDramaConfig(@Param("configId") configId: string) {
    return this.svc.getDramaConfig(configId);
  }

  // ─── [5] Competition ──────────────────────────────────────────────────────

  @Post(":eventId/competition/init")
  initCompetition(@Param("eventId") eventId: string, @Body() body: { compType: string; isTeamBased?: boolean; teamSize?: number; scoringRubric?: object }) {
    return this.svc.initCompetition(eventId, body);
  }

  @Post("competition/:configId/participants")
  registerCompetitionParticipant(@Param("configId") configId: string, @Body() body: { memberId: string; memberRole: string; teamName?: string; teamMembers?: string[] }) {
    return this.svc.registerCompetitionParticipant(configId, body);
  }

  @Post("competition/:configId/judges")
  addJudge(@Param("configId") configId: string, @Body() body: { staffId: string; role?: string }) {
    return this.svc.addJudge(configId, body.staffId, body.role);
  }

  @Post("competition/:configId/rounds")
  createCompRound(@Param("configId") configId: string, @Body() body: { roundName: string; roundNo: number; scheduledAt?: string }) {
    return this.svc.createCompRound(configId, body.roundName, body.roundNo, body.scheduledAt ? new Date(body.scheduledAt) : undefined);
  }

  @Post("competition/rounds/:roundId/scores")
  submitScore(@Param("roundId") roundId: string, @Body() body: { participantId: string; judgeId: string; score: number; notes?: string }) {
    return this.svc.submitScore(roundId, body.participantId, body.judgeId, body.score, body.notes);
  }

  @Patch("competition/participants/:participantId/eliminate")
  eliminateParticipant(@Param("participantId") participantId: string) {
    return this.svc.eliminateParticipant(participantId);
  }

  @Post("competition/:configId/declare-result")
  declareCompetitionResult(@Param("configId") configId: string) {
    return this.svc.declareCompetitionResult(configId);
  }

  // ─── [6] Club management ──────────────────────────────────────────────────

  @Post(":schoolId/clubs")
  createClub(@Param("schoolId") schoolId: string, @Body() body: { name: string; description?: string; advisorId: string; meetingSchedule?: string }) {
    return this.svc.createClub(schoolId, body);
  }

  @Patch("clubs/:clubId")
  updateClub(@Param("clubId") clubId: string, @Body() body: any) {
    return this.svc.updateClub(clubId, body);
  }

  @Get(":schoolId/clubs")
  getClubs(@Param("schoolId") schoolId: string) {
    return this.svc.getClubs(schoolId);
  }

  @Post("clubs/:clubId/apply")
  applyForClub(@Param("clubId") clubId: string, @Body() body: { studentId: string }) {
    return this.svc.applyForClub(clubId, body.studentId);
  }

  @Patch("clubs/memberships/:membershipId/review")
  reviewClubApplication(@Param("membershipId") membershipId: string, @Body() body: { action: "APPROVED" | "REJECTED"; approvedBy: string }) {
    return this.svc.reviewClubApplication(membershipId, body.action, body.approvedBy);
  }

  @Post("clubs/:clubId/sessions")
  recordClubSession(@Param("clubId") clubId: string, @Body() body: { sessionDate: string; topic?: string; attendees: string[]; notes?: string }) {
    return this.svc.recordClubSession(clubId, { ...body, sessionDate: new Date(body.sessionDate) });
  }

  @Post("clubs/memberships/:membershipId/achievements")
  addClubAchievement(@Param("membershipId") membershipId: string, @Body() body: { achievement: string }) {
    return this.svc.addClubAchievement(membershipId, body.achievement);
  }

  @Get("clubs/:clubId/members")
  getClubMembers(@Param("clubId") clubId: string, @Query("status") status?: string) {
    return this.svc.getClubMembers(clubId, status);
  }

  // ─── [7] NCC / NSS / Scouts ───────────────────────────────────────────────

  @Post(":schoolId/youth-orgs")
  createYouthUnit(@Param("schoolId") schoolId: string, @Body() body: { orgType: string; unitName: string; officerId: string }) {
    return this.svc.createYouthUnit(schoolId, body);
  }

  @Post("youth-orgs/:unitId/members")
  enrollYouthMember(@Param("unitId") unitId: string, @Body() body: { studentId: string }) {
    return this.svc.enrollYouthMember(unitId, body.studentId);
  }

  @Patch("youth-orgs/members/:memberId")
  updateYouthMemberProgress(@Param("memberId") memberId: string, @Body() body: { rank?: string; hoursToAdd?: number; badgeLevel?: string }) {
    return this.svc.updateYouthMemberProgress(memberId, body);
  }

  @Post("youth-orgs/:unitId/camps")
  createYouthCamp(@Param("unitId") unitId: string, @Body() body: { campName: string; startDate: string; endDate: string; location?: string; participants: string[] }) {
    return this.svc.createYouthCamp(unitId, { ...body, startDate: new Date(body.startDate), endDate: new Date(body.endDate) });
  }

  @Get(":schoolId/youth-orgs")
  getYouthUnit(@Param("schoolId") schoolId: string) {
    return this.svc.getYouthUnit(schoolId);
  }

  // ─── [8] Student Council ──────────────────────────────────────────────────

  @Post(":schoolId/council/elections")
  startElection(@Param("schoolId") schoolId: string, @Body() body: { academicYear: string }) {
    return this.svc.startElection(schoolId, body.academicYear);
  }

  @Post("council/elections/:electionId/nominate")
  nominate(@Param("electionId") electionId: string, @Body() body: { studentId: string; role: string }) {
    return this.svc.nominate(electionId, body.studentId, body.role);
  }

  @Patch("council/elections/:electionId/open-voting")
  openVoting(@Param("electionId") electionId: string) {
    return this.svc.openVoting(electionId);
  }

  @Post("council/nominations/:nominationId/vote")
  castVote(@Param("nominationId") nominationId: string, @Body() body: { voterId: string }) {
    return this.svc.castVote(nominationId, body.voterId);
  }

  @Post("council/elections/:electionId/declare-results")
  declareElectionResults(@Param("electionId") electionId: string) {
    return this.svc.declareElectionResults(electionId);
  }

  @Post("council/elections/:electionId/meetings")
  recordCouncilMeeting(
    @Param("electionId") electionId: string,
    @Body() body: { meetingDate: string; agenda?: string; minutes?: string; proposals?: object[]; budgetUsedRs?: number },
  ) {
    return this.svc.recordCouncilMeeting(electionId, { ...body, meetingDate: new Date(body.meetingDate) });
  }

  @Get(":schoolId/council/:academicYear")
  getElection(@Param("schoolId") schoolId: string, @Param("academicYear") academicYear: string) {
    return this.svc.getElection(schoolId, academicYear);
  }

  // ─── [9] House / Team system ──────────────────────────────────────────────

  @Post(":schoolId/houses")
  createHouse(@Param("schoolId") schoolId: string, @Body() body: { name: string; colour?: string; motto?: string; houseMasterId?: string }) {
    return this.svc.createHouse(schoolId, body);
  }

  @Patch("houses/:houseId")
  updateHouse(@Param("houseId") houseId: string, @Body() body: any) {
    return this.svc.updateHouse(houseId, body);
  }

  @Post("houses/:houseId/members")
  assignStudentToHouse(@Param("houseId") houseId: string, @Body() body: { studentId: string; academicYear: string }) {
    return this.svc.assignStudentToHouse(houseId, body.studentId, body.academicYear);
  }

  @Get("houses/:houseId")
  getHouseDetails(@Param("houseId") houseId: string) {
    return this.svc.getHouseDetails(houseId);
  }

  @Get(":schoolId/houses")
  getHouses(@Param("schoolId") schoolId: string) {
    return this.svc.getHouses(schoolId);
  }

  // ─── [10] Photo gallery + portfolio achievements ───────────────────────────

  @Post(":eventId/photos")
  publishEventPhotos(
    @Param("eventId") eventId: string,
    @Body() body: { photos: Array<{ url: string; caption?: string }>; uploadedBy: string },
  ) {
    return this.svc.publishEventPhotos(eventId, body.photos, body.uploadedBy);
  }

  @Get(":eventId/photos")
  getEventPhotos(@Param("eventId") eventId: string) {
    return this.svc.getEventPhotos(eventId);
  }

  @Post("portfolio/achievements")
  linkAchievementToPortfolio(@Body() body: { studentId: string; eventId: string; eventTitle: string; achievementType: string; description: string; awardedAt: string }) {
    return this.svc.linkAchievementToPortfolio(body.studentId, { ...body, awardedAt: new Date(body.awardedAt) });
  }

  @Get("portfolio/:studentId/achievements")
  getStudentEventAchievements(@Param("studentId") studentId: string) {
    return this.svc.getStudentEventAchievements(studentId);
  }
}
