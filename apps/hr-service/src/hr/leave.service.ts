import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";

export type LeaveStatus = "PENDING" | "HOD_APPROVED" | "PRINCIPAL_APPROVED" | "APPROVED" | "REJECTED" | "CANCELLED";

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Leave policy ─────────────────────────────────────────────────────────────

  async createLeavePolicy(schoolId: string, data: {
    leaveType: string; annualDays: number; carryForward: boolean;
    maxCarryForward?: number; encashmentAllowed?: boolean;
    applicableTo?: string;
  }) {
    return this.prisma.leavePolicy.create({ data: { schoolId, ...data } });
  }

  async getLeavePolicies(schoolId: string) {
    return this.prisma.leavePolicy.findMany({ where: { schoolId }, orderBy: { leaveType: "asc" } });
  }

  async updateLeavePolicy(id: string, data: any) {
    return this.prisma.leavePolicy.update({ where: { id }, data });
  }

  // ─── Leave balance ────────────────────────────────────────────────────────────

  async initLeaveBalances(staffId: string, academicYearId: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId }, select: { schoolId: true } });
    if (!staff) throw new NotFoundError("Staff not found");

    const policies = await this.prisma.leavePolicy.findMany({ where: { schoolId: staff.schoolId } });

    const ops = policies.map((p) =>
      this.prisma.leaveBalance.upsert({
        where: { staffId_leaveType_academicYearId: { staffId, leaveType: p.leaveType, academicYearId } },
        update: {},
        create: { staffId, leaveType: p.leaveType, academicYearId, totalDays: p.annualDays, usedDays: 0, remainingDays: p.annualDays },
      }),
    );
    return this.prisma.$transaction(ops);
  }

  async getLeaveBalances(staffId: string, academicYearId: string) {
    return this.prisma.leaveBalance.findMany({ where: { staffId, academicYearId } });
  }

  // ─── Leave application ────────────────────────────────────────────────────────

  async applyLeave(data: {
    staffId: string; leaveType: string; fromDate: Date; toDate: Date;
    reason: string; academicYearId: string; substituteStaffId?: string;
  }) {
    const days = Math.ceil((data.toDate.getTime() - data.fromDate.getTime()) / 86400000) + 1;

    const balance = await this.prisma.leaveBalance.findUnique({
      where: { staffId_leaveType_academicYearId: { staffId: data.staffId, leaveType: data.leaveType, academicYearId: data.academicYearId } },
    });
    if (!balance) throw new NotFoundError("Leave balance not initialised for this type");
    if (balance.remainingDays < days) throw new ConflictError(`Insufficient leave balance. Available: ${balance.remainingDays} days, Requested: ${days} days`);

    return this.prisma.leaveApplication.create({
      data: {
        staffId: data.staffId, leaveType: data.leaveType,
        fromDate: data.fromDate, toDate: data.toDate, days,
        reason: data.reason, academicYearId: data.academicYearId,
        substituteStaffId: data.substituteStaffId, status: "PENDING",
      },
    });
  }

  async processLeave(applicationId: string, action: "HOD_APPROVED" | "PRINCIPAL_APPROVED" | "APPROVED" | "REJECTED", reviewedBy: string, remarks?: string) {
    const app = await this.prisma.leaveApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundError("Leave application not found");

    await this.prisma.leaveApplication.update({
      where: { id: applicationId },
      data: { status: action, reviewedBy, remarks, reviewedAt: new Date() },
    });

    // Deduct from balance on final approval
    if (action === "APPROVED") {
      await this.prisma.leaveBalance.update({
        where: { staffId_leaveType_academicYearId: { staffId: app.staffId, leaveType: app.leaveType, academicYearId: app.academicYearId } },
        data: { usedDays: { increment: app.days }, remainingDays: { decrement: app.days } },
      });
    }

    return this.prisma.leaveApplication.findUnique({ where: { id: applicationId } });
  }

  async getLeaveApplications(filters: { staffId?: string; schoolId?: string; status?: string; academicYearId?: string }) {
    return this.prisma.leaveApplication.findMany({
      where: {
        ...(filters.staffId ? { staffId: filters.staffId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {}),
        ...(filters.schoolId ? { staff: { schoolId: filters.schoolId } } : {}),
      },
      include: { staff: { include: { user: { include: { profile: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
