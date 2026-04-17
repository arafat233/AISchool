import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

@Injectable()
export class ExitService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Resignation ─────────────────────────────────────────────────────────────

  async submitResignation(data: {
    staffId: string; reason: string; lastWorkingDate: Date; noticePeriodDays?: number; remarks?: string;
  }) {
    return this.prisma.staffExit.create({
      data: {
        staffId: data.staffId,
        reason: data.reason,
        lastWorkingDate: data.lastWorkingDate,
        noticePeriodDays: data.noticePeriodDays ?? 30,
        remarks: data.remarks,
        status: "RESIGNATION_SUBMITTED",
        exitType: "RESIGNATION",
      },
    });
  }

  async getExit(staffId: string) {
    return this.prisma.staffExit.findFirst({ where: { staffId }, orderBy: { createdAt: "desc" } });
  }

  async updateExitStatus(exitId: string, status: string) {
    return this.prisma.staffExit.update({ where: { id: exitId }, data: { status } });
  }

  // ─── Handover checklist ───────────────────────────────────────────────────────

  async addHandoverItem(exitId: string, item: { task: string; assignedTo?: string; dueDate?: Date }) {
    return this.prisma.handoverItem.create({
      data: { exitId, task: item.task, assignedTo: item.assignedTo, dueDate: item.dueDate, isDone: false },
    });
  }

  async markHandoverItemDone(itemId: string) {
    return this.prisma.handoverItem.update({ where: { id: itemId }, data: { isDone: true, completedAt: new Date() } });
  }

  async getHandoverChecklist(exitId: string) {
    return this.prisma.handoverItem.findMany({ where: { exitId }, orderBy: { createdAt: "asc" } });
  }

  // ─── No-dues clearance ────────────────────────────────────────────────────────

  async addNoDueItem(exitId: string, data: { department: string; clearedBy?: string; status: "PENDING" | "CLEARED" | "FLAGGED"; remarks?: string }) {
    return this.prisma.noDueClearance.upsert({
      where: { exitId_department: { exitId, department: data.department } },
      update: { clearedBy: data.clearedBy, status: data.status, remarks: data.remarks, clearedAt: data.status === "CLEARED" ? new Date() : undefined },
      create: { exitId, department: data.department, clearedBy: data.clearedBy, status: data.status, remarks: data.remarks },
    });
  }

  async getNoDueClearances(exitId: string) {
    return this.prisma.noDueClearance.findMany({ where: { exitId } });
  }

  // ─── F&F settlement ───────────────────────────────────────────────────────────

  async recordFnFSettlement(exitId: string, data: {
    salaryDue: number; leavencashment: number; gratuity?: number; otherDeductions?: number; netSettlement: number; settledOn: Date;
  }) {
    const exit = await this.prisma.staffExit.findUnique({ where: { id: exitId } });
    if (!exit) throw new NotFoundError("Exit record not found");

    return this.prisma.fnfSettlement.create({
      data: { exitId, ...data },
    });
  }

  // ─── Exit interview trigger ────────────────────────────────────────────────────

  async scheduleExitInterview(exitId: string, scheduledAt: Date, interviewerId: string) {
    return this.prisma.exitInterview.upsert({
      where: { exitId },
      update: { scheduledAt, interviewerId },
      create: { exitId, scheduledAt, interviewerId, status: "SCHEDULED" },
    });
  }

  async submitExitInterviewResponses(exitId: string, responses: any, overallRating?: number) {
    return this.prisma.exitInterview.update({
      where: { exitId },
      data: { responses, overallRating, completedAt: new Date(), status: "COMPLETED" },
    });
  }
}
