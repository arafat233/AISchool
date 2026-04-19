import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PrismaService } from "@school-erp/database";

@Controller("audit")
@UseGuards(AuthGuard("jwt"))
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query("tenantId") tenantId?: string,
    @Query("action") action?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("take") take?: string,
  ) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(take ?? 100), 500),
      include: { tenant: { select: { name: true } } },
    }).then((logs) =>
      logs.map((l: any) => ({
        id: l.id,
        schoolName: l.tenant?.name ?? l.tenantId,
        userEmail: l.userEmail,
        action: l.action,
        resource: l.resource,
        resourceId: l.resourceId,
        ip: l.ip,
        createdAt: l.createdAt,
      })),
    );
  }
}
