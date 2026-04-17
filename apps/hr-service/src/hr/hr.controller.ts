import {
  Body, Controller, Delete, Get, Param, Post, Put, Query,
  Req, UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { StaffService } from "./staff.service";
import { RecruitmentService } from "./recruitment.service";
import { LeaveService } from "./leave.service";
import { TrainingService } from "./training.service";
import { ExitService } from "./exit.service";
import { GrievanceService } from "./grievance.service";
import { AppraisalService } from "./appraisal.service";
import { SubstituteService } from "./substitute.service";

@UseGuards(AuthGuard("jwt"))
@Controller("hr")
export class HrController {
  constructor(
    private readonly staff: StaffService,
    private readonly recruitment: RecruitmentService,
    private readonly leave: LeaveService,
    private readonly training: TrainingService,
    private readonly exit: ExitService,
    private readonly grievance: GrievanceService,
    private readonly appraisal: AppraisalService,
    private readonly substitute: SubstituteService,
  ) {}

  // ─── Staff CRUD ───────────────────────────────────────────────────────────────

  @Post("staff")
  createStaff(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.staff.createStaff(req.user.schoolId!, { ...body, joinDate: new Date(body.joinDate) });
  }

  @Get("staff")
  listStaff(
    @Req() req: Request & { user: RequestUser },
    @Query("departmentId") departmentId?: string,
    @Query("designationId") designationId?: string,
    @Query("status") status?: string,
  ) {
    return this.staff.listStaff(req.user.schoolId!, { departmentId, designationId, status });
  }

  @Get("staff/:id")
  getStaff(@Param("id") id: string) {
    return this.staff.getStaff(id);
  }

  @Put("staff/:id")
  updateStaff(@Param("id") id: string, @Body() body: any) {
    return this.staff.updateStaff(id, body);
  }

  // ─── Documents ────────────────────────────────────────────────────────────────

  @Post("staff/:id/documents")
  addDocument(@Param("id") staffId: string, @Body() body: any) {
    return this.staff.addDocument(staffId, body);
  }

  @Get("staff/:id/documents")
  getDocuments(@Param("id") staffId: string) {
    return this.staff.getDocuments(staffId);
  }

  // ─── Probation ────────────────────────────────────────────────────────────────

  @Get("probation/due")
  getProbationDue(@Req() req: Request & { user: RequestUser }, @Query("withinDays") days?: string) {
    return this.staff.getProbationDueList(req.user.schoolId!, days ? +days : 30);
  }

  @Post("staff/:id/confirm")
  confirmStaff(@Param("id") id: string, @Body("confirmationDate") date: string) {
    return this.staff.confirmStaff(id, new Date(date));
  }

  // ─── Subject/class-teacher mapping ───────────────────────────────────────────

  @Post("staff/:id/subjects")
  assignSubject(@Param("id") staffId: string, @Body() body: { subjectId: string; gradeLevelId: string; sectionId?: string }) {
    return this.staff.assignSubject(staffId, body);
  }

  @Delete("staff/:id/subjects")
  removeSubject(@Param("id") staffId: string, @Query("subjectId") subjectId: string, @Query("gradeLevelId") gradeLevelId: string) {
    return this.staff.removeSubject(staffId, subjectId, gradeLevelId);
  }

  @Post("staff/:id/class-teacher")
  assignClassTeacher(@Param("id") staffId: string, @Body() body: { gradeLevelId: string; sectionId: string; academicYearId: string }) {
    return this.staff.assignClassTeacher(staffId, body);
  }

  // ─── Recruitment ──────────────────────────────────────────────────────────────

  @Post("vacancies")
  createVacancy(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.recruitment.createVacancy(req.user.schoolId!, { ...body, closingDate: body.closingDate ? new Date(body.closingDate) : undefined });
  }

  @Get("vacancies")
  getVacancies(@Req() req: Request & { user: RequestUser }, @Query("status") status?: string) {
    return this.recruitment.getVacancies(req.user.schoolId!, status);
  }

  @Put("vacancies/:id")
  updateVacancy(@Param("id") id: string, @Body() body: any) {
    return this.recruitment.updateVacancy(id, body);
  }

  @Post("vacancies/:id/apply")
  applyVacancy(@Param("id") vacancyId: string, @Body() body: any) {
    return this.recruitment.applyForVacancy(vacancyId, body);
  }

  @Get("vacancies/:id/applications")
  getApplications(@Param("id") vacancyId: string, @Query("stage") stage?: any) {
    return this.recruitment.getApplications(vacancyId, stage);
  }

  @Put("applications/:id/stage")
  updateStage(@Param("id") id: string, @Body("stage") stage: any, @Body("notes") notes?: string) {
    return this.recruitment.updateStage(id, stage, notes);
  }

  @Post("applications/:id/interview")
  scheduleInterview(@Param("id") id: string, @Body() body: any) {
    return this.recruitment.scheduleInterview(id, { ...body, scheduledAt: new Date(body.scheduledAt) });
  }

  @Post("interviews/:id/feedback")
  submitInterviewFeedback(@Param("id") id: string, @Body() body: any) {
    return this.recruitment.submitInterviewFeedback(id, body);
  }

  @Post("applications/:id/offer")
  generateOffer(@Param("id") id: string, @Body() body: any) {
    return this.recruitment.generateOffer(id, { ...body, joiningDate: new Date(body.joiningDate), offerExpiry: new Date(body.offerExpiry) });
  }

  // ─── Leave policies ───────────────────────────────────────────────────────────

  @Post("leave-policies")
  createLeavePolicy(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.leave.createLeavePolicy(req.user.schoolId!, body);
  }

  @Get("leave-policies")
  getLeavePolicies(@Req() req: Request & { user: RequestUser }) {
    return this.leave.getLeavePolicies(req.user.schoolId!);
  }

  @Put("leave-policies/:id")
  updateLeavePolicy(@Param("id") id: string, @Body() body: any) {
    return this.leave.updateLeavePolicy(id, body);
  }

  // ─── Leave balances + applications ───────────────────────────────────────────

  @Post("staff/:id/leave-balances/init")
  initLeaveBalances(@Param("id") staffId: string, @Body("academicYearId") academicYearId: string) {
    return this.leave.initLeaveBalances(staffId, academicYearId);
  }

  @Get("staff/:id/leave-balances")
  getLeaveBalances(@Param("id") staffId: string, @Query("academicYearId") academicYearId: string) {
    return this.leave.getLeaveBalances(staffId, academicYearId);
  }

  @Post("leave-applications")
  applyLeave(@Body() body: any) {
    return this.leave.applyLeave({ ...body, fromDate: new Date(body.fromDate), toDate: new Date(body.toDate) });
  }

  @Put("leave-applications/:id/process")
  processLeave(@Param("id") id: string, @Req() req: Request & { user: RequestUser }, @Body("action") action: any, @Body("remarks") remarks?: string) {
    return this.leave.processLeave(id, action, req.user.id, remarks);
  }

  @Get("leave-applications")
  getLeaveApplications(
    @Req() req: Request & { user: RequestUser },
    @Query("staffId") staffId?: string,
    @Query("status") status?: string,
    @Query("academicYearId") academicYearId?: string,
  ) {
    return this.leave.getLeaveApplications({ schoolId: req.user.schoolId!, staffId, status, academicYearId });
  }

  // ─── Training & CPD ───────────────────────────────────────────────────────────

  @Post("trainings")
  createTraining(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.training.createTraining(req.user.schoolId!, { ...body, startDate: new Date(body.startDate), endDate: new Date(body.endDate) });
  }

  @Get("trainings")
  getTrainings(@Req() req: Request & { user: RequestUser }, @Query("status") status?: string) {
    return this.training.getTrainings(req.user.schoolId!, { status });
  }

  @Put("trainings/:id")
  updateTraining(@Param("id") id: string, @Body() body: any) {
    return this.training.updateTraining(id, body);
  }

  @Post("trainings/:id/attendance")
  markTrainingAttendance(@Param("id") id: string, @Body("staffId") staffId: string, @Body("attended") attended: boolean) {
    return this.training.markAttendance(id, staffId, attended);
  }

  @Get("trainings/:id/attendance")
  getTrainingAttendance(@Param("id") id: string) {
    return this.training.getAttendance(id);
  }

  @Get("trainings/:id/effectiveness")
  getEffectiveness(@Param("id") id: string) {
    return this.training.getEffectivenessReport(id);
  }

  @Post("trainings/:id/feedback")
  submitFeedback(@Req() req: Request & { user: RequestUser }, @Param("id") id: string, @Body("rating") rating: number, @Body("comments") comments?: string) {
    return this.training.submitTrainingFeedback(id, req.user.id, rating, comments);
  }

  @Get("staff/:id/cpd-hours")
  getCpdHours(@Param("id") staffId: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.training.getStaffCpdHours(staffId, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  // ─── Exit management ─────────────────────────────────────────────────────────

  @Post("staff/:id/exit")
  submitResignation(@Param("id") staffId: string, @Body() body: any) {
    return this.exit.submitResignation({ staffId, ...body, lastWorkingDate: new Date(body.lastWorkingDate) });
  }

  @Get("staff/:id/exit")
  getExit(@Param("id") staffId: string) {
    return this.exit.getExit(staffId);
  }

  @Put("exits/:id/status")
  updateExitStatus(@Param("id") id: string, @Body("status") status: string) {
    return this.exit.updateExitStatus(id, status);
  }

  @Post("exits/:id/handover")
  addHandoverItem(@Param("id") exitId: string, @Body() item: any) {
    return this.exit.addHandoverItem(exitId, item);
  }

  @Put("handover-items/:id/done")
  markHandoverDone(@Param("id") id: string) {
    return this.exit.markHandoverItemDone(id);
  }

  @Get("exits/:id/handover")
  getHandover(@Param("id") exitId: string) {
    return this.exit.getHandoverChecklist(exitId);
  }

  @Post("exits/:id/no-dues")
  updateNoDue(@Param("id") exitId: string, @Body() body: any) {
    return this.exit.addNoDueItem(exitId, body);
  }

  @Get("exits/:id/no-dues")
  getNoDues(@Param("id") exitId: string) {
    return this.exit.getNoDueClearances(exitId);
  }

  @Post("exits/:id/fnf")
  recordFnF(@Param("id") exitId: string, @Body() body: any) {
    return this.exit.recordFnFSettlement(exitId, { ...body, settledOn: new Date(body.settledOn) });
  }

  @Post("exits/:id/interview")
  scheduleExitInterview(@Param("id") exitId: string, @Body("scheduledAt") scheduledAt: string, @Body("interviewerId") interviewerId: string) {
    return this.exit.scheduleExitInterview(exitId, new Date(scheduledAt), interviewerId);
  }

  @Post("exits/:id/interview/submit")
  submitExitInterview(@Param("id") exitId: string, @Body("responses") responses: any, @Body("overallRating") rating?: number) {
    return this.exit.submitExitInterviewResponses(exitId, responses, rating);
  }

  // ─── Grievances ───────────────────────────────────────────────────────────────

  @Post("grievances")
  submitGrievance(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.grievance.submitGrievance({ schoolId: req.user.schoolId!, staffId: req.user.id, ...body });
  }

  @Get("grievances")
  listGrievances(@Req() req: Request & { user: RequestUser }, @Query("status") status?: string, @Query("category") category?: string) {
    return this.grievance.getGrievances(req.user.schoolId!, { status, category });
  }

  @Put("grievances/:id/assign")
  assignGrievance(@Param("id") id: string, @Body("assignedTo") assignedTo: string, @Body("resolutionDeadline") deadline?: string) {
    return this.grievance.assignGrievance(id, assignedTo, deadline ? new Date(deadline) : undefined);
  }

  @Put("grievances/:id/resolve")
  resolveGrievance(@Param("id") id: string, @Body("resolution") resolution: string) {
    return this.grievance.resolveGrievance(id, resolution);
  }

  @Post("grievances/escalate")
  escalateGrievances(@Req() req: Request & { user: RequestUser }) {
    return this.grievance.checkAndEscalate(req.user.schoolId!);
  }

  // ─── Appraisals ───────────────────────────────────────────────────────────────

  @Post("appraisals")
  createAppraisal(@Body() body: any) {
    return this.appraisal.createAppraisal(body);
  }

  @Get("appraisals")
  listAppraisals(@Query("staffId") staffId?: string, @Query("academicYearId") academicYearId?: string) {
    return this.appraisal.listAppraisals(staffId, academicYearId);
  }

  @Post("appraisals/:id/self-assessment")
  selfAssessment(@Param("id") id: string, @Body("selfScores") scores: any) {
    return this.appraisal.submitSelfAssessment(id, scores);
  }

  @Post("appraisals/:id/hod-review")
  hodReview(@Req() req: Request & { user: RequestUser }, @Param("id") id: string, @Body("hodScores") scores: any, @Body("hodComments") comments?: string) {
    return this.appraisal.submitHodReview(id, req.user.id, scores, comments);
  }

  @Post("appraisals/:id/signoff")
  principalSignOff(@Req() req: Request & { user: RequestUser }, @Param("id") id: string, @Body("finalScore") score: number, @Body("incrementEligible") inc: boolean, @Body("comments") comments?: string) {
    return this.appraisal.principalSignOff(id, req.user.id, score, inc, comments);
  }

  // ─── Substitute marketplace ───────────────────────────────────────────────────

  @Post("substitutes/free-periods")
  markFreePeriod(@Req() req: Request & { user: RequestUser }, @Body("date") date: string, @Body("periodNo") periodNo: number) {
    return this.substitute.markFreePeriod(req.user.id, new Date(date), periodNo);
  }

  @Delete("substitutes/free-periods")
  removeFreePeriod(@Req() req: Request & { user: RequestUser }, @Body("date") date: string, @Body("periodNo") periodNo: number) {
    return this.substitute.removeFreePeriod(req.user.id, new Date(date), periodNo);
  }

  @Get("substitutes/free-slots")
  getFreeSlots(@Req() req: Request & { user: RequestUser }, @Query("date") date: string) {
    return this.substitute.getFreeSlots(req.user.schoolId!, new Date(date));
  }

  @Get("substitutes/suggest")
  suggestSubstitutes(
    @Req() req: Request & { user: RequestUser },
    @Query("absentStaffId") absentStaffId: string,
    @Query("date") date: string,
    @Query("periodNo") periodNo: string,
    @Query("subjectId") subjectId: string,
  ) {
    return this.substitute.suggestSubstitutes(absentStaffId, new Date(date), +periodNo, subjectId, req.user.schoolId!);
  }

  @Post("substitutes/book")
  bookSubstitute(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.substitute.bookSubstitute({ schoolId: req.user.schoolId!, ...body, date: new Date(body.date) });
  }

  @Post("substitutes/external")
  addExternal(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.substitute.addExternalSubstitute(req.user.schoolId!, body);
  }

  @Get("substitutes/external")
  getExternalPool(@Req() req: Request & { user: RequestUser }) {
    return this.substitute.getExternalSubstitutePool(req.user.schoolId!);
  }
}
