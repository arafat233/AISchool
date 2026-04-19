import { Controller, Get, Post, Param, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { HealthScoreService } from "./health-score.service";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

class SubmitNpsDto {
  @IsInt() @Min(0) @Max(10) score: number;
  @IsString() @IsOptional() feedback?: string;
}

@Controller("health")
@UseGuards(AuthGuard("jwt"))
export class HealthScoreController {
  constructor(private readonly svc: HealthScoreService) {}

  @Get("score/:tenantId")
  compute(@Param("tenantId") tenantId: string) { return this.svc.computeForTenant(tenantId); }

  @Post("score/all")
  computeAll() { return this.svc.computeAll(); }

  @Post("nps/:tenantId")
  submitNps(@Param("tenantId") tenantId: string, @Body() dto: SubmitNpsDto) {
    return this.svc.submitNps(tenantId, dto.score, dto.feedback);
  }

  @Get("services")
  services() {
    // Returns a list of service health stubs — real implementation would ping each service's /health endpoint
    const services = [
      "auth", "user", "student", "academic", "attendance", "fee",
      "notification", "exam", "lms", "hr", "payroll", "certificate",
      "admission", "transport", "health", "library", "event", "expense",
      "scholarship", "ops", "report",
    ];
    return services.map((s) => ({ service: `${s}-service`, status: "ok" }));
  }
}
