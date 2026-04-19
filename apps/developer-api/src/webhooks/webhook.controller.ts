/**
 * Webhook registration and delivery log endpoints.
 */
import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, Req,
} from "@nestjs/common";
import { ApiTags, ApiSecurity, ApiOperation } from "@nestjs/swagger";
import { ApiKeyGuard, ApiKeyContext } from "../auth/api-key.guard";
import { WebhookService, WebhookEvent } from "./webhook.service";

class RegisterWebhookDto {
  url!: string;
  events!: WebhookEvent[];
  secret!: string;     // Consumer generates this; we store the hash
}

@ApiTags("Webhooks")
@ApiSecurity("ApiKeyAuth")
@Controller("webhooks")
@UseGuards(ApiKeyGuard)
export class WebhookController {
  constructor(private readonly svc: WebhookService) {}

  @Post()
  @ApiOperation({ summary: "Register a webhook endpoint" })
  async register(@Req() req: any, @Body() dto: RegisterWebhookDto) {
    const ctx: ApiKeyContext = req.apiKeyContext;
    await this.svc.registerEndpoint(ctx.schoolId, dto.url, dto.events, dto.secret);
    return { registered: true, url: dto.url, events: dto.events };
  }

  @Get()
  @ApiOperation({ summary: "List registered webhook endpoints" })
  async list(@Req() req: any) {
    const ctx: ApiKeyContext = req.apiKeyContext;
    return this.svc.listEndpoints(ctx.schoolId);
  }

  @Delete(":endpointId")
  @ApiOperation({ summary: "Deactivate a webhook endpoint" })
  async deactivate(@Req() req: any, @Param("endpointId") id: string) {
    const ctx: ApiKeyContext = req.apiKeyContext;
    await this.svc.deactivateEndpoint(id, ctx.schoolId);
    return { deactivated: true };
  }

  @Get("logs")
  @ApiOperation({ summary: "Webhook delivery logs (last 100 attempts)" })
  async logs(
    @Req() req: any,
    @Query("endpointId") endpointId?: string,
  ) {
    const ctx: ApiKeyContext = req.apiKeyContext;
    return this.svc.getDeliveryLog(ctx.schoolId, endpointId);
  }

  /**
   * Internal endpoint — called by other microservices to fire webhook events.
   * Not exposed in public Swagger docs (no ApiKeyGuard here).
   */
  @Post("_internal/fire")
  async fireInternal(@Body() body: { schoolId: string; event: WebhookEvent; payload: Record<string, unknown> }) {
    await this.svc.dispatch(body.schoolId, body.event, body.payload);
    return { dispatched: true };
  }
}
