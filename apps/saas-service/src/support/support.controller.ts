import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { SupportService } from "./support.service";
import { IsIn, IsOptional, IsString } from "class-validator";

class CreateTicketDto {
  @IsString() subject: string;
  @IsString() description: string;
  @IsIn(["LOW","MEDIUM","HIGH","CRITICAL"]) @IsOptional() priority?: string;
}

class ReplyDto {
  @IsString() message: string;
  @IsString() authorEmail: string;
  @IsOptional() isAgent?: boolean;
}

class CloseDto {
  @IsString() resolution: string;
}

class EscalateDto {
  @IsString() @IsOptional() sentryIssueUrl?: string;
}

@Controller("support")
@UseGuards(AuthGuard("jwt"))
export class SupportController {
  constructor(private readonly svc: SupportService) {}

  @Post("tickets/:tenantId")
  create(@Param("tenantId") tenantId: string, @Body() dto: CreateTicketDto) {
    return this.svc.createTicket(tenantId, dto);
  }

  @Get("tickets")
  list(@Query("tenantId") tenantId?: string, @Query("status") status?: string) {
    return this.svc.listTickets(tenantId, status);
  }

  @Get("tickets/:id")
  get(@Param("id") id: string) { return this.svc.getTicket(id); }

  @Post("tickets/:id/reply")
  reply(@Param("id") id: string, @Body() dto: ReplyDto) { return this.svc.addReply(id, dto); }

  @Patch("tickets/:id/close")
  close(@Param("id") id: string, @Body() dto: CloseDto) { return this.svc.closeTicket(id, dto.resolution); }

  @Patch("tickets/:id/escalate")
  escalate(@Param("id") id: string, @Body() dto: EscalateDto) { return this.svc.escalateToEngineering(id, dto.sentryIssueUrl); }
}
