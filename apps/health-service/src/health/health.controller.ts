import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { HealthService } from "./health.service";

@UseGuards(AuthGuard("jwt"))
@Controller()
export class HealthController {
  constructor(private readonly svc: HealthService) {}

  // ─── Medical profile ──────────────────────────────────────────────────────────

  @Put("medical-profiles/:studentId")
  upsertProfile(@Param("studentId") studentId: string, @Body() body: any) {
    return this.svc.upsertMedicalProfile(studentId, body);
  }

  @Get("medical-profiles/:studentId")
  getProfile(@Param("studentId") studentId: string) {
    return this.svc.getMedicalProfile(studentId);
  }

  // ─── Nurse visits ─────────────────────────────────────────────────────────────

  @Post("nurse-visits")
  logVisit(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.logNurseVisit(req.user.schoolId!, { ...body, attendedBy: req.user.id });
  }

  @Get("nurse-visits")
  getVisits(@Req() req: Request & { user: RequestUser }, @Query("studentId") studentId?: string) {
    return this.svc.getNurseVisits(req.user.schoolId!, studentId);
  }

  // ─── Medication admin ─────────────────────────────────────────────────────────

  @Post("medication-logs")
  logMedication(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.logMedicationAdmin(req.user.schoolId!, {
      ...body,
      scheduledTime: new Date(body.scheduledTime),
      administeredAt: body.administeredAt ? new Date(body.administeredAt) : undefined,
    });
  }

  @Get("medication-logs/:studentId")
  getMedicationLogs(@Req() req: Request & { user: RequestUser }, @Param("studentId") studentId: string) {
    return this.svc.getMedicationLogs(req.user.schoolId!, studentId);
  }

  // ─── Incidents ────────────────────────────────────────────────────────────────

  @Post("incidents")
  reportIncident(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.reportIncident(req.user.schoolId!, { ...body, reportedBy: req.user.id });
  }

  @Get("incidents")
  getIncidents(@Req() req: Request & { user: RequestUser }, @Query("studentId") studentId?: string) {
    return this.svc.getIncidents(req.user.schoolId!, studentId);
  }

  // ─── Vaccinations ─────────────────────────────────────────────────────────────

  @Post("vaccinations/:studentId")
  addVaccination(@Param("studentId") studentId: string, @Body() body: any) {
    return this.svc.upsertVaccination(studentId, {
      ...body,
      administeredOn: body.administeredOn ? new Date(body.administeredOn) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    });
  }

  @Get("vaccinations/:studentId")
  getVaccinations(@Param("studentId") studentId: string) {
    return this.svc.getVaccinations(studentId);
  }

  @Get("vaccinations/alerts/all")
  getVaccinationAlerts(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getVaccinationAlerts(req.user.schoolId!);
  }

  // ─── Fitness ──────────────────────────────────────────────────────────────────

  @Post("fitness")
  recordFitness(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.recordFitness({ ...body, recordedBy: req.user.id });
  }

  @Get("fitness/:studentId")
  getFitness(@Param("studentId") studentId: string) {
    return this.svc.getFitnessHistory(studentId);
  }

  // ─── AED ──────────────────────────────────────────────────────────────────────

  @Post("aed")
  createAed(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.upsertAed(req.user.schoolId!, {
      ...body,
      padExpiryDate: body.padExpiryDate ? new Date(body.padExpiryDate) : undefined,
    });
  }

  @Get("aed")
  getAeds(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getAeds(req.user.schoolId!);
  }

  // ─── Counselling ──────────────────────────────────────────────────────────────

  @Post("counselling")
  createSession(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.createCounsellingSession(req.user.schoolId!, {
      ...body,
      counsellorId: req.user.id,
      nextSession: body.nextSession ? new Date(body.nextSession) : undefined,
    });
  }

  @Get("counselling/:studentId")
  getSessions(@Req() req: Request & { user: RequestUser }, @Param("studentId") studentId: string) {
    return this.svc.getCounsellingSessionsForStudent(req.user.schoolId!, studentId);
  }

  // ─── Discipline ───────────────────────────────────────────────────────────────

  @Post("discipline")
  recordDiscipline(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.recordDisciplineIncident(req.user.schoolId!, { ...body, recordedBy: req.user.id });
  }

  @Get("discipline")
  getDiscipline(@Req() req: Request & { user: RequestUser }, @Query("studentId") studentId?: string) {
    return this.svc.getDisciplineIncidents(req.user.schoolId!, studentId);
  }

  // ─── Anonymous mood check-in ──────────────────────────────────────────────────

  @Post("mood")
  submitMood(@Req() req: Request & { user: RequestUser }, @Body("moodScore") score: number, @Body("note") note?: string) {
    return this.svc.submitMoodCheckIn(req.user.schoolId!, score, note);
  }

  @Get("mood/summary")
  getMoodSummary(@Req() req: Request & { user: RequestUser }, @Query("weekStart") weekStart: string) {
    return this.svc.getMoodSummary(req.user.schoolId!, new Date(weekStart));
  }
}
