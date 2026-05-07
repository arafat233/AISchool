import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AssetService } from "./asset.service";
import { RegisterAssetDto, UpdateAssetDto, LogAssetMaintenanceDto, CreateInsurancePolicyDto } from "./dto/asset.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("assets")
export class AssetController {
  constructor(private readonly svc: AssetService) {}

  @Post(":schoolId")
  registerAsset(@Param("schoolId") schoolId: string, @Body() dto: RegisterAssetDto) {
    return this.svc.registerAsset(schoolId, { ...dto, purchaseDate: new Date(dto.purchaseDate) });
  }

  @Patch(":assetId")
  updateAsset(@Param("assetId") assetId: string, @Body() dto: UpdateAssetDto) {
    return this.svc.updateAsset(assetId, dto);
  }

  @Get(":schoolId")
  getAssets(@Param("schoolId") schoolId: string, @Query("category") category?: string, @Query("condition") condition?: string) {
    return this.svc.getAssets(schoolId, category, condition);
  }

  @Post(":schoolId/depreciate")
  runDepreciation(@Param("schoolId") schoolId: string) {
    return this.svc.runDepreciation(schoolId);
  }

  @Post(":assetId/allocate")
  allocateAsset(@Param("assetId") assetId: string, @Body() body: { department: string; roomNo?: string; assignedTo?: string }) {
    return this.svc.allocateAsset(assetId, body);
  }

  @Patch(":assetId/return")
  returnAsset(@Param("assetId") assetId: string) {
    return this.svc.returnAsset(assetId);
  }

  @Get(":assetId/allocations")
  getAllocations(@Param("assetId") assetId: string) {
    return this.svc.getAllocations(assetId);
  }

  @Post(":assetId/maintenance")
  logMaintenance(@Param("assetId") assetId: string, @Body() dto: LogAssetMaintenanceDto) {
    return this.svc.logMaintenance(assetId, { ...dto, serviceDate: new Date(dto.serviceDate), nextServiceDue: dto.nextServiceDue ? new Date(dto.nextServiceDue) : undefined });
  }

  @Get(":assetId/maintenance")
  getMaintenanceHistory(@Param("assetId") assetId: string) {
    return this.svc.getMaintenanceHistory(assetId);
  }

  @Get(":schoolId/maintenance/due")
  getAssetsDueService(@Param("schoolId") schoolId: string) {
    return this.svc.getAssetsDueService(schoolId);
  }

  @Post(":schoolId/insurance")
  createPolicy(@Param("schoolId") schoolId: string, @Body() dto: CreateInsurancePolicyDto) {
    return this.svc.createInsurancePolicy(schoolId, { ...dto, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) });
  }

  @Get(":schoolId/insurance/expiring")
  getExpiring(@Param("schoolId") schoolId: string, @Query("daysAhead") daysAhead?: string) {
    return this.svc.getExpiringPolicies(schoolId, daysAhead ? parseInt(daysAhead) : undefined);
  }

  @Post("insurance/:policyId/claims")
  fileClaim(@Param("policyId") policyId: string, @Body() body: { incidentDate: string; description: string; claimAmtRs: number }) {
    return this.svc.fileClaim(policyId, { ...body, incidentDate: new Date(body.incidentDate) });
  }

  @Patch("insurance/claims/:claimId")
  updateClaim(@Param("claimId") claimId: string, @Body() body: { status: string; settledAmtRs?: number }) {
    return this.svc.updateClaim(claimId, body);
  }

  @Get(":schoolId/insurance")
  getPolicies(@Param("schoolId") schoolId: string) {
    return this.svc.getPolicies(schoolId);
  }

  @Post(":schoolId/verification/start")
  startVerification(@Param("schoolId") schoolId: string, @Body() body: { conductedBy: string }) {
    return this.svc.startVerification(schoolId, body.conductedBy);
  }

  @Post("verification/:verificationId/complete")
  completeVerification(@Param("verificationId") verificationId: string, @Body() body: { entries: Array<{ assetId: string; physicalCount: number }> }) {
    return this.svc.completeVerification(verificationId, body.entries);
  }

  @Get(":schoolId/verifications")
  getVerifications(@Param("schoolId") schoolId: string) {
    return this.svc.getVerifications(schoolId);
  }
}
