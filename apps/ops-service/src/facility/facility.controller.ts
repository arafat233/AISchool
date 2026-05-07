import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FacilityService } from "./facility.service";
import {
  SubmitFacilityRequestDto, CreatePreventiveScheduleDto, LogPestControlDto,
  RecordHousekeepingInspectionDto, RecordUtilityBillDto, LogWasteDto,
  LogWaterQualityDto, LogPoolQualityDto,
} from "./dto/facility.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("facility")
export class FacilityController {
  constructor(private readonly svc: FacilityService) {}

  @Post(":schoolId/requests")
  submitRequest(@Param("schoolId") schoolId: string, @Body() dto: SubmitFacilityRequestDto) {
    return this.svc.submitRequest(schoolId, dto.reportedBy, dto);
  }

  @Patch("requests/:requestId/assign")
  assignRequest(@Param("requestId") requestId: string, @Body() body: { assignedTo: string }) {
    return this.svc.assignRequest(requestId, body.assignedTo);
  }

  @Patch("requests/:requestId/resolve")
  resolveRequest(@Param("requestId") requestId: string, @Body() body: { resolutionNotes: string }) {
    return this.svc.resolveRequest(requestId, body.resolutionNotes);
  }

  @Post(":schoolId/requests/flag-overdue")
  flagOverdue(@Param("schoolId") schoolId: string) {
    return this.svc.flagOverdueRequests(schoolId);
  }

  @Get(":schoolId/requests")
  getRequests(@Param("schoolId") schoolId: string, @Query("status") status?: string, @Query("category") category?: string) {
    return this.svc.getRequests(schoolId, status, category);
  }

  @Post(":schoolId/preventive")
  createPM(@Param("schoolId") schoolId: string, @Body() dto: CreatePreventiveScheduleDto) {
    return this.svc.createPreventiveSchedule(schoolId, dto);
  }

  @Patch("preventive/:pmId/complete")
  completePM(@Param("pmId") pmId: string, @Body() body?: { notes?: string }) {
    return this.svc.completePM(pmId, body?.notes);
  }

  @Get(":schoolId/preventive/overdue")
  getOverduePM(@Param("schoolId") schoolId: string) {
    return this.svc.getOverduePM(schoolId);
  }

  @Post(":schoolId/pest-control")
  logPestControl(@Param("schoolId") schoolId: string, @Body() dto: LogPestControlDto) {
    return this.svc.logPestControl(schoolId, { ...dto, scheduledAt: new Date(dto.scheduledAt), completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined, nextScheduled: dto.nextScheduled ? new Date(dto.nextScheduled) : undefined });
  }

  @Post(":schoolId/housekeeping/inspections")
  recordInspection(@Param("schoolId") schoolId: string, @Body() dto: RecordHousekeepingInspectionDto) {
    return this.svc.recordHousekeepingInspection(schoolId, dto.inspectedBy, { ...dto, inspectionDate: new Date(dto.inspectionDate) });
  }

  @Get(":schoolId/housekeeping/inspections")
  getInspections(@Param("schoolId") schoolId: string, @Query("area") area?: string) {
    return this.svc.getHousekeepingHistory(schoolId, area);
  }

  @Post(":schoolId/utilities")
  recordUtility(@Param("schoolId") schoolId: string, @Body() dto: RecordUtilityBillDto) {
    return this.svc.recordUtilityBill(schoolId, dto);
  }

  @Get(":schoolId/utilities/trend")
  getUtilityTrend(@Param("schoolId") schoolId: string, @Query("type") type: string, @Query("months") months?: string) {
    return this.svc.getUtilityTrend(schoolId, type, months ? parseInt(months) : undefined);
  }

  @Get(":schoolId/utilities/kpi")
  getEnergyKPI(@Param("schoolId") schoolId: string, @Query("period") period: string, @Query("studentCount") studentCount: string) {
    return this.svc.getEnergyKPI(schoolId, period, parseInt(studentCount));
  }

  @Post(":schoolId/waste")
  logWaste(@Param("schoolId") schoolId: string, @Body() dto: LogWasteDto) {
    return this.svc.logWaste(schoolId, { ...dto, logDate: new Date(dto.logDate) });
  }

  @Get(":schoolId/waste/analytics")
  getWasteAnalytics(@Param("schoolId") schoolId: string, @Query("from") from: string, @Query("to") to: string) {
    return this.svc.getWasteAnalytics(schoolId, new Date(from), new Date(to));
  }

  @Post(":schoolId/water-quality")
  logWaterQuality(@Param("schoolId") schoolId: string, @Body() dto: LogWaterQualityDto) {
    return this.svc.logWaterQuality(schoolId, { ...dto, logDate: new Date(dto.logDate), nextFilterDue: dto.nextFilterDue ? new Date(dto.nextFilterDue) : undefined });
  }

  @Get(":schoolId/water-quality")
  getWaterHistory(@Param("schoolId") schoolId: string, @Query("source") source?: string) {
    return this.svc.getWaterQualityHistory(schoolId, source);
  }

  @Post(":schoolId/pool")
  logPoolQuality(@Param("schoolId") schoolId: string, @Body() dto: LogPoolQualityDto) {
    return this.svc.logPoolQuality(schoolId, { ...dto, logDate: new Date(dto.logDate) });
  }

  @Get(":schoolId/pool")
  getPoolHistory(@Param("schoolId") schoolId: string) {
    return this.svc.getPoolHistory(schoolId);
  }
}
