import { Controller, Get, Post, Param, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { OnboardingService } from "./onboarding.service";
import { IsObject, IsOptional, IsString } from "class-validator";

class CompleteStepDto {
  @IsString() step: string;
  @IsObject() @IsOptional() data?: Record<string, any>;
}

@Controller("onboarding")
@UseGuards(AuthGuard("jwt"))
export class OnboardingController {
  constructor(private readonly svc: OnboardingService) {}

  @Get("steps")
  steps() { return this.svc.getSteps(); }

  @Get(":tenantId")
  checklist(@Param("tenantId") tenantId: string) { return this.svc.getChecklist(tenantId); }

  @Post(":tenantId/complete")
  complete(@Param("tenantId") tenantId: string, @Body() dto: CompleteStepDto) {
    return this.svc.completeStep(tenantId, dto.step as any, dto.data);
  }
}
