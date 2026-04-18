import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

// SLA hours per category
const SLA_HOURS: Record<string, number> = {
  ELECTRICAL: 4, PLUMBING: 2, GENERAL: 24, IT: 8, CARPENTRY: 48, CIVIL: 72,
};

// Preventive maintenance schedules in days
const PM_FREQUENCY: Record<string, number> = {
  AC: 90, GENERATOR: 365, LIFT: 180, FIRE_SYSTEM: 180, OTHER: 365,
};

@Injectable()
export class FacilityService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── [1] Maintenance request + auto-assign + SLA ─────────────────────────
  async submitRequest(schoolId: string, reportedBy: string, data: {
    location: string; issueType: string; category: string; description: string; photoUrl?: string; priority?: string;
  }) {
    const slaHours = SLA_HOURS[data.category] ?? 24;
    const slaDeadline = new Date(Date.now() + slaHours * 3_600_000);
    return this.prisma.maintenanceRequest.create({ data: { schoolId, reportedBy, slaDeadline, ...data } });
  }

  async assignRequest(requestId: string, assignedTo: string) {
    return this.prisma.maintenanceRequest.update({ where: { id: requestId }, data: { status: "ASSIGNED", assignedTo } });
  }

  async resolveRequest(requestId: string, resolutionNotes: string) {
    return this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: { status: "RESOLVED", resolvedAt: new Date(), resolutionNotes },
    });
  }

  async flagOverdueRequests(schoolId: string) {
    const now = new Date();
    await this.prisma.maintenanceRequest.updateMany({
      where: { schoolId, status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] }, slaDeadline: { lt: now } },
      data: { status: "OVERDUE" },
    });
    return this.prisma.maintenanceRequest.findMany({ where: { schoolId, status: "OVERDUE" }, orderBy: { slaDeadline: "asc" } });
  }

  async getRequests(schoolId: string, status?: string, category?: string) {
    return this.prisma.maintenanceRequest.findMany({
      where: { schoolId, ...(status ? { status } : {}), ...(category ? { category } : {}) },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
  }

  // ─── [2] Preventive maintenance schedule ─────────────────────────────────
  async createPreventiveSchedule(schoolId: string, data: { itemName: string; category: string; frequencyDays?: number; assignedTo?: string }) {
    const freq = data.frequencyDays ?? PM_FREQUENCY[data.category] ?? 365;
    const nextDueAt = new Date(Date.now() + freq * 86_400_000);
    return this.prisma.preventiveMaintenance.create({ data: { schoolId, ...data, frequencyDays: freq, nextDueAt } });
  }

  async completePM(pmId: string, notes?: string) {
    const pm = await this.prisma.preventiveMaintenance.findUnique({ where: { id: pmId } });
    if (!pm) throw new NotFoundError("PM record not found");
    const nextDueAt = new Date(Date.now() + pm.frequencyDays * 86_400_000);
    return this.prisma.preventiveMaintenance.update({
      where: { id: pmId },
      data: { status: "DONE", lastDoneAt: new Date(), nextDueAt, notes },
    });
  }

  async getOverduePM(schoolId: string) {
    const now = new Date();
    await this.prisma.preventiveMaintenance.updateMany({
      where: { schoolId, status: { in: ["SCHEDULED", "IN_PROGRESS"] }, nextDueAt: { lt: now } },
      data: { status: "OVERDUE" },
    });
    return this.prisma.preventiveMaintenance.findMany({ where: { schoolId, status: "OVERDUE" }, orderBy: { nextDueAt: "asc" } });
  }

  // ─── [3] Pest control & housekeeping ─────────────────────────────────────
  async logPestControl(schoolId: string, data: { contractorName: string; scheduledAt: Date; completedAt?: Date; certificateUrl?: string; areasCovered: string[]; pestTypes: string[]; chemicalsUsed?: string; nextScheduled?: Date }) {
    return this.prisma.pestControlRecord.create({ data: { schoolId, ...data } });
  }

  async recordHousekeepingInspection(schoolId: string, inspectedBy: string, data: { area: string; inspectionDate: Date; score: number; issues?: object[] }) {
    const rec = await this.prisma.housekeepingInspection.create({
      data: { schoolId, inspectedBy, ...data, escalated: data.score < 60 },
    });
    if (data.score < 60) {
      console.log(`[FACILITY] Housekeeping score ${data.score} in ${data.area} — escalated to Facility Manager`);
    }
    return rec;
  }

  async getHousekeepingHistory(schoolId: string, area?: string) {
    return this.prisma.housekeepingInspection.findMany({
      where: { schoolId, ...(area ? { area } : {}) },
      orderBy: { inspectionDate: "desc" },
    });
  }

  // ─── [4] Utility & energy management ─────────────────────────────────────
  async recordUtilityBill(schoolId: string, data: { utilityType: string; period: string; amountRs: number; units?: number; invoiceUrl?: string; budgetAmtRs?: number }) {
    return this.prisma.utilityBill.upsert({
      where: { schoolId_utilityType_period: { schoolId, utilityType: data.utilityType, period: data.period } },
      create: { schoolId, ...data },
      update: { amountRs: data.amountRs, units: data.units, invoiceUrl: data.invoiceUrl },
    });
  }

  async getUtilityTrend(schoolId: string, utilityType: string, months = 12) {
    const from = new Date();
    from.setMonth(from.getMonth() - months);
    const fromPeriod = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
    return this.prisma.utilityBill.findMany({
      where: { schoolId, utilityType, period: { gte: fromPeriod } },
      orderBy: { period: "asc" },
    });
  }

  async getEnergyKPI(schoolId: string, period: string, studentCount: number) {
    const bills = await this.prisma.utilityBill.findMany({ where: { schoolId, period } });
    const totalRs = bills.reduce((s, b) => s + Number(b.amountRs), 0);
    const totalUnits = bills.reduce((s, b) => s + Number(b.units ?? 0), 0);
    return {
      period, totalRs, totalUnits,
      costPerStudent: studentCount > 0 ? Math.round(totalRs / studentCount) : 0,
      unitsPerStudent: studentCount > 0 ? (totalUnits / studentCount).toFixed(2) : 0,
    };
  }

  // ─── [5] Waste management ─────────────────────────────────────────────────
  async logWaste(schoolId: string, data: { logDate: Date; dryKg?: number; wetKg?: number; hazardousKg?: number; eWasteKg?: number; contractorName?: string; disposalMethod?: string }) {
    return this.prisma.wasteLog.create({ data: { schoolId, ...data } });
  }

  async getWasteAnalytics(schoolId: string, from: Date, to: Date) {
    const logs = await this.prisma.wasteLog.findMany({ where: { schoolId, logDate: { gte: from, lte: to } } });
    return {
      totalDryKg: logs.reduce((s, l) => s + Number(l.dryKg ?? 0), 0),
      totalWetKg: logs.reduce((s, l) => s + Number(l.wetKg ?? 0), 0),
      totalHazardousKg: logs.reduce((s, l) => s + Number(l.hazardousKg ?? 0), 0),
      totalEWasteKg: logs.reduce((s, l) => s + Number(l.eWasteKg ?? 0), 0),
      logs,
    };
  }

  // ─── [6] Water quality management ────────────────────────────────────────
  async logWaterQuality(schoolId: string, data: { logDate: Date; source: string; testResultUrl?: string; isCompliant?: boolean; ph?: number; tds?: number; notes?: string; nextFilterDue?: Date }) {
    return this.prisma.waterQualityLog.create({ data: { schoolId, ...data } });
  }

  async getWaterQualityHistory(schoolId: string, source?: string) {
    return this.prisma.waterQualityLog.findMany({
      where: { schoolId, ...(source ? { source } : {}) },
      orderBy: { logDate: "desc" },
      take: 24,
    });
  }

  // ─── [7] Swimming pool management ────────────────────────────────────────
  async logPoolQuality(schoolId: string, data: { logDate: Date; ph: number; chlorinePpm: number; turbidityNtu?: number; chemicalsDosedMl?: number; lifeguardId?: string; incidentLog?: string; isPoolOpen?: boolean }) {
    const isOpen = data.ph >= 7.2 && data.ph <= 7.8 && data.chlorinePpm >= 1 && data.chlorinePpm <= 3;
    const rec = await this.prisma.poolQualityLog.create({
      data: { schoolId, ...data, isPoolOpen: data.isPoolOpen !== undefined ? data.isPoolOpen : isOpen },
    });
    if (!isOpen) {
      console.log(`[FACILITY] Pool quality out of range (pH ${data.ph}, Cl ${data.chlorinePpm} ppm) — pool closed automatically`);
    }
    return rec;
  }

  async getPoolHistory(schoolId: string) {
    return this.prisma.poolQualityLog.findMany({ where: { schoolId }, orderBy: { logDate: "desc" }, take: 30 });
  }
}
