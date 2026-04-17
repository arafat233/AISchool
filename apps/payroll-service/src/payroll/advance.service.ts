import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";

@Injectable()
export class AdvanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Request salary advance ───────────────────────────────────────────────────

  async requestAdvance(data: {
    staffId: string; amount: number; reason: string; repaymentMonths: number;
  }) {
    const emiAmount = +(data.amount / data.repaymentMonths).toFixed(2);

    return this.prisma.salaryAdvance.create({
      data: {
        staffId: data.staffId,
        amount: data.amount,
        reason: data.reason,
        repaymentMonths: data.repaymentMonths,
        emiAmount,
        outstandingAmount: data.amount,
        status: "PENDING",
      },
    });
  }

  // ─── Approve ──────────────────────────────────────────────────────────────────

  async approveAdvance(id: string, approvedBy: string) {
    const advance = await this.prisma.salaryAdvance.findUnique({ where: { id } });
    if (!advance) throw new NotFoundError("Advance not found");
    if (advance.status !== "PENDING") throw new ConflictError("Only pending advances can be approved");

    return this.prisma.salaryAdvance.update({
      where: { id },
      data: { status: "ACTIVE", approvedBy, approvedAt: new Date() },
    });
  }

  async rejectAdvance(id: string, rejectedBy: string, remarks?: string) {
    return this.prisma.salaryAdvance.update({ where: { id }, data: { status: "REJECTED", approvedBy: rejectedBy, remarks } });
  }

  // ─── Get advances ─────────────────────────────────────────────────────────────

  async getAdvances(filters: { staffId?: string; schoolId?: string; status?: string }) {
    return this.prisma.salaryAdvance.findMany({
      where: {
        ...(filters.staffId ? { staffId: filters.staffId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.schoolId ? { staff: { schoolId: filters.schoolId } } : {}),
      },
      include: { staff: { include: { user: { include: { profile: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // ─── Outstanding balance ─────────────────────────────────────────────────────

  async getOutstandingBalance(staffId: string) {
    const active = await this.prisma.salaryAdvance.findMany({ where: { staffId, status: "ACTIVE" } });
    const total = active.reduce((s: number, a: any) => s + (a.outstandingAmount ?? 0), 0);
    return { staffId, activeAdvances: active.length, totalOutstanding: total, advances: active };
  }
}
