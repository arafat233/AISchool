import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

const ESCALATION_DAYS = 7; // auto-escalate if unresolved after 7 days

@Injectable()
export class GrievanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Submit grievance ─────────────────────────────────────────────────────────

  async submitGrievance(data: {
    schoolId: string; staffId?: string; // null if anonymous
    category: string; description: string; isAnonymous?: boolean; priority?: string;
  }) {
    return this.prisma.staffGrievance.create({
      data: {
        schoolId: data.schoolId,
        staffId: data.isAnonymous ? null : (data.staffId ?? null),
        category: data.category,
        description: data.description,
        isAnonymous: data.isAnonymous ?? false,
        priority: data.priority ?? "MEDIUM",
        status: "OPEN",
      },
    });
  }

  // ─── Assign grievance ─────────────────────────────────────────────────────────

  async assignGrievance(grievanceId: string, assignedTo: string, resolutionDeadline?: Date) {
    const deadline = resolutionDeadline ?? new Date(Date.now() + ESCALATION_DAYS * 86400000);
    return this.prisma.staffGrievance.update({
      where: { id: grievanceId },
      data: { assignedTo, resolutionDeadline: deadline, status: "IN_PROGRESS" },
    });
  }

  // ─── Update resolution ────────────────────────────────────────────────────────

  async resolveGrievance(grievanceId: string, resolution: string) {
    return this.prisma.staffGrievance.update({
      where: { id: grievanceId },
      data: { resolution, status: "RESOLVED", resolvedAt: new Date() },
    });
  }

  // ─── Escalate overdue ─────────────────────────────────────────────────────────

  async checkAndEscalate(schoolId: string) {
    const overdue = await this.prisma.staffGrievance.findMany({
      where: {
        schoolId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        resolutionDeadline: { lt: new Date() },
      },
    });

    const ops = overdue.map((g) =>
      this.prisma.staffGrievance.update({
        where: { id: g.id },
        data: { status: "ESCALATED", escalatedAt: new Date() },
      }),
    );
    return this.prisma.$transaction(ops);
  }

  // ─── List grievances ──────────────────────────────────────────────────────────

  async getGrievances(schoolId: string, filters?: { status?: string; category?: string; staffId?: string }) {
    return this.prisma.staffGrievance.findMany({
      where: {
        schoolId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.staffId ? { staffId: filters.staffId } : {}),
      },
      include: {
        staff: { include: { user: { include: { profile: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
