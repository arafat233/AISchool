import { Controller, Get, Post, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiKeyService } from "./apikey.service";
import { IsString } from "class-validator";

class IssueKeyDto {
  @IsString() label: string;
}

@Controller("apikeys")
@UseGuards(AuthGuard("jwt"))
export class ApiKeyController {
  constructor(private readonly svc: ApiKeyService) {}

  @Post(":tenantId")
  issue(@Param("tenantId") tenantId: string, @Body() dto: IssueKeyDto) {
    return this.svc.issueKey(tenantId, dto.label);
  }

  @Get(":tenantId")
  list(@Param("tenantId") tenantId: string) { return this.svc.listKeys(tenantId); }

  @Get(":tenantId/usage")
  usage(@Param("tenantId") tenantId: string) { return this.svc.getUsageDashboard(tenantId); }

  @Delete(":tenantId/:keyId")
  revoke(@Param("tenantId") tenantId: string, @Param("keyId") keyId: string) {
    return this.svc.revokeKey(keyId, tenantId);
  }
}
