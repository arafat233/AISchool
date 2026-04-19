import { Controller, Get, Post, Put, Patch, Param, Body, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { TenantService } from "./tenant.service";
import { CreateTenantDto, UpdateTenantDto, ChangePlanDto, UpdateStatusDto } from "./tenant.dto";

@Controller("tenants")
@UseGuards(AuthGuard("jwt"))
export class TenantController {
  constructor(private readonly svc: TenantService) {}

  @Post()
  create(@Body() dto: CreateTenantDto) { return this.svc.createTenant(dto); }

  @Get()
  list(@Query("status") status?: string) { return this.svc.listTenants(status); }

  @Get("summary")
  summary() { return this.svc.getSummary(); }

  @Get("plans")
  plans() { return this.svc.getPlanPricing(); }

  @Get(":id")
  get(@Param("id") id: string) { return this.svc.getTenant(id); }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTenantDto) { return this.svc.updateTenant(id, dto); }

  @Patch(":id/plan")
  changePlan(@Param("id") id: string, @Body() dto: ChangePlanDto) { return this.svc.changePlan(id, dto); }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateStatusDto) { return this.svc.updateStatus(id, dto); }

  @Post(":id/activate")
  activate(@Param("id") id: string) { return this.svc.activateTenant(id); }

  @Post(":id/suspend")
  suspend(@Param("id") id: string, @Body() body: { reason?: string }) { return this.svc.suspendTenant(id, body.reason); }
}
