import { Controller, Get } from "@nestjs/common";

import { PrismaService } from "@school-erp/database";

import { Public } from "../decorators/public.decorator";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", service: "auth-service", timestamp: new Date().toISOString() };
  }
}
