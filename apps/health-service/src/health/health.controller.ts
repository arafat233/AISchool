import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { HealthService } from "./health.service";
import {
  UpsertMedicalProfileDto, LogNurseVisitDto, LogMedicationDto,
  ReportIncidentDto, AddVaccinationDto, RecordFitnessDto,
  CreateAedDto, CreateCounsellingSessionDto, RecordDisciplineDto,
} from "./dto/health.dto";

@UseGuards(AuthGuard("jwt"))
@Controller()
export class HealthController {
  constructor(private readonly svc: HealthService) {}

  // ─── Medical profile ──────────────────────────────────────────────────────────

  @Put("medical-profiles/:studentId")
  upsertProfile(@Param("studentId") studentId: string, @Body() dto: UpsertMedicalProfileDto) {
    return this.svc.upsertMedicalProfile(studentId, dto);
  }

  @Get("medical-profiles/:studentId")
  getProfile(@Param("studentId") studentId: string) {
    return this.svc.getMedicalProfile(studentId);
  }

  // ─── Nurse visits ─────────────────────────────────────────────────────────────

  @Post("nurse-visits")
  logVisit(@Req() req: Request & { user: RequestUser }, @Body() dto: LogNurseVisitDto) {
    return this.svc.logNurseVisit(req.user.schoolId!, { ...dto, attendedBy: req.user.id });
  }

  @Get("nurse-visits")
  getVisits(@Req() req: Request & { user: RequestUser }, @Query("studentId") studentId?: string) {
    return this.svc.getNurseVisits(req.user.schoolId!, studentId);
  }

  // ─── Medication admin ─────────────────────────────────────────────────────────

  @Post("medication-logs")
  logMedication(@Req() req: Request & { user: RequestUser }, @Body() dto: LogMedicationDto) {
    return this.svc.logMedicationAdmin(req.user.schoolId!, {
      ...dto,
      scheduledTime: new Date(dto.scheduledTime),
      administeredAt: dto.administeredAt ? new Date(dto.administeredAt) : undefined,
    });
  }

  @Get("medication-logs/:studentId")
  getMedicationLogs(@Req() req: Request & { user: RequestUser }, @Param("studentId") studentId: string) {
    return this.svc.getMedicationLogs(req.user.schoolId!, studentId);
  }

  // ─── Incidents ────────────────────────────────────────────────────────────────

  @Post("incidents")
  reportIncident(@Req() req: Request & { user: RequestUser }, @Body() dto: ReportIncidentDto) {
    return this.svc.reportIncident(req.user.schoolId!, { ...dto, reportedBy: req.user.id });
  }

  @Get("incidents")
  getIncidents(@Req() req: Request & { user: RequestUser }, @Query("studentId") studentId?: string) {
    return this.svc.getIncidents(req.user.schoolId!, studentId);
  }

  // ─── Vaccinations ─────────────────────────────────────────────────────────────

  @Post("vaccinations/:studentId")
  addVaccination(@Param("studentId") studentId: string, @Body() dto: AddVaccinationDto) {
    return this.svc.upsertVaccination(studentId, {
      ...dto,
      administeredOn: dto.administeredOn ? new Date(dto.administeredOn) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
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
  recordFitness(@Req() req: Request & { user: RequestUser }, @Body() dto: RecordFitnessDto) {
    return this.svc.recordFitness({ ...dto, recordedBy: req.user.id });
  }

  @Get("fitness/:studentId")
  getFitness(@Param("studentId") studentId: string) {
    return this.svc.getFitnessHistory(studentId);
  }

  // ─── AED ──────────────────────────────────────────────────────────────────────

  @Post("aed")
  createAed(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateAedDto) {
    return this.svc.upsertAed(req.user.schoolId!, {
      ...dto,
      padExpiryDate: dto.padExpiryDate ? new Date(dto.padExpiryDate) : undefined,
    });
  }

  @Get("aed")
  getAeds(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getAeds(req.user.schoolId!);
  }

  // ─── Counselling ──────────────────────────────────────────────────────────────

  @Post("counselling")
  createSession(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateCounsellingSessionDto) {
    return this.svc.createCounsellingSession(req.user.schoolId!, {
      ...dto,
      counsellorId: req.user.id,
      nextSession: dto.nextSession ? new Date(dto.nextSession) : undefined,
    });
  }

  @Get("counselling/:studentId")
  getSessions(@Req() req: Request & { user: RequestUser }, @Param("studentId") studentId: string) {
    return this.svc.getCounsellingSessionsForStudent(req.user.schoolId!, studentId);
  }

  // ─── Discipline ───────────────────────────────────────────────────────────────

  @Post("discipline")
  recordDiscipline(@Req() req: Request & { user: RequestUser }, @Body() dto: RecordDisciplineDto) {
    return this.svc.recordDisciplineIncident(req.user.schoolId!, { ...dto, recordedBy: req.user.id });
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
