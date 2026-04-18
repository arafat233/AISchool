import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

@Injectable()
export class AssetService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── [1] Fixed asset register ────────────────────────────────────────────
  async registerAsset(schoolId: string, data: {
    name: string; category: string; qrTag?: string; purchaseDate: Date;
    costRs: number; usefulLifeYears?: number; depreciationMethod?: string; depreciationRate?: number; condition?: string;
  }) {
    return this.prisma.fixedAsset.create({
      data: { schoolId, ...data, currentValueRs: data.costRs },
    });
  }

  async updateAsset(assetId: string, data: Partial<{ condition: string; isDisposed: boolean; qrTag: string }>) {
    return this.prisma.fixedAsset.update({ where: { id: assetId }, data });
  }

  async getAssets(schoolId: string, category?: string, condition?: string) {
    return this.prisma.fixedAsset.findMany({
      where: { schoolId, isDisposed: false, ...(category ? { category } : {}), ...(condition ? { condition } : {}) },
      include: { allocations: { where: { returnedAt: null }, take: 1 }, _count: { select: { maintenanceLogs: true } } },
      orderBy: { name: "asc" },
    });
  }

  // ─── [2] Asset depreciation calculation ──────────────────────────────────
  async runDepreciation(schoolId: string) {
    const assets = await this.prisma.fixedAsset.findMany({ where: { schoolId, isDisposed: false } });
    const now = new Date();
    const updates: Array<{ id: string; currentValueRs: number }> = [];

    for (const asset of assets) {
      const yearsElapsed = (now.getTime() - asset.purchaseDate.getTime()) / (365.25 * 86_400_000);
      let currentValue: number;

      if (asset.depreciationMethod === "SLM") {
        // Straight-line: cost - (cost × rate% × years)
        const annualDep = (Number(asset.costRs) * Number(asset.depreciationRate)) / 100;
        currentValue = Math.max(0, Number(asset.costRs) - annualDep * yearsElapsed);
      } else {
        // WDV: cost × (1 - rate%)^years
        currentValue = Number(asset.costRs) * Math.pow(1 - Number(asset.depreciationRate) / 100, yearsElapsed);
      }

      updates.push({ id: asset.id, currentValueRs: Math.round(currentValue * 100) / 100 });
    }

    await this.prisma.$transaction(
      updates.map((u) => this.prisma.fixedAsset.update({ where: { id: u.id }, data: { currentValueRs: u.currentValueRs } }))
    );

    return { updated: updates.length, assets: updates };
  }

  // ─── [3] Asset allocation ────────────────────────────────────────────────
  async allocateAsset(assetId: string, data: { department: string; roomNo?: string; assignedTo?: string }) {
    // Return any existing active allocation first
    await this.prisma.assetAllocation.updateMany({
      where: { assetId, returnedAt: null },
      data: { returnedAt: new Date() },
    });
    return this.prisma.assetAllocation.create({ data: { assetId, ...data } });
  }

  async returnAsset(assetId: string) {
    return this.prisma.assetAllocation.updateMany({
      where: { assetId, returnedAt: null },
      data: { returnedAt: new Date() },
    });
  }

  async getAllocations(assetId: string) {
    return this.prisma.assetAllocation.findMany({ where: { assetId }, orderBy: { assignedAt: "desc" } });
  }

  // ─── [4] Asset maintenance log ───────────────────────────────────────────
  async logMaintenance(assetId: string, data: { serviceDate: Date; serviceProvider?: string; costRs?: number; description?: string; nextServiceDue?: Date }) {
    return this.prisma.assetMaintenanceLog.create({ data: { assetId, ...data } });
  }

  async getMaintenanceHistory(assetId: string) {
    return this.prisma.assetMaintenanceLog.findMany({ where: { assetId }, orderBy: { serviceDate: "desc" } });
  }

  async getAssetsDueService(schoolId: string) {
    const now = new Date();
    const assets = await this.prisma.fixedAsset.findMany({ where: { schoolId, isDisposed: false }, select: { id: true, name: true, category: true } });
    const due: Array<{ assetId: string; name: string; nextServiceDue: Date }> = [];

    for (const a of assets) {
      const latest = await this.prisma.assetMaintenanceLog.findFirst({
        where: { assetId: a.id, nextServiceDue: { not: null } },
        orderBy: { serviceDate: "desc" },
      });
      if (latest?.nextServiceDue && latest.nextServiceDue <= now) {
        due.push({ assetId: a.id, name: a.name, nextServiceDue: latest.nextServiceDue });
      }
    }

    return due;
  }

  // ─── [5] Property insurance — policy + claims ────────────────────────────
  async createInsurancePolicy(schoolId: string, data: { policyNo: string; insurer: string; coverageType: string; sumInsuredRs: number; premiumRs: number; startDate: Date; endDate: Date; documentUrl?: string }) {
    return this.prisma.propertyInsurance.create({ data: { schoolId, ...data } });
  }

  async getExpiringPolicies(schoolId: string, daysAhead = 60) {
    const deadline = new Date(Date.now() + daysAhead * 86_400_000);
    return this.prisma.propertyInsurance.findMany({
      where: { schoolId, endDate: { lte: deadline, gte: new Date() } },
      orderBy: { endDate: "asc" },
    });
  }

  async fileClaim(policyId: string, data: { incidentDate: Date; description: string; claimAmtRs: number }) {
    return this.prisma.insuranceClaim.create({ data: { policyId, ...data } });
  }

  async updateClaim(claimId: string, data: { status: string; settledAmtRs?: number }) {
    return this.prisma.insuranceClaim.update({
      where: { id: claimId },
      data: { ...data, settledAt: data.status === "SETTLED" ? new Date() : undefined },
    });
  }

  async getPolicies(schoolId: string) {
    return this.prisma.propertyInsurance.findMany({
      where: { schoolId },
      include: { claims: true },
      orderBy: { endDate: "asc" },
    });
  }

  // ─── [6] Annual asset verification ───────────────────────────────────────
  async startVerification(schoolId: string, conductedBy: string) {
    const systemCount = await this.prisma.fixedAsset.count({ where: { schoolId, isDisposed: false } });
    return this.prisma.assetVerification.create({
      data: { schoolId, conductedBy, verificationDate: new Date(), totalSystemCount: systemCount, totalPhysicalCount: 0 },
    });
  }

  async completeVerification(verificationId: string, physicalEntries: Array<{ assetId: string; physicalCount: number }>) {
    const verification = await this.prisma.assetVerification.findUnique({ where: { id: verificationId } });
    if (!verification) throw new NotFoundError("Verification not found");

    const discrepancies: Array<{ assetId: string; name: string; systemCount: number; physicalCount: number; diff: number }> = [];
    let totalPhysical = 0;

    for (const entry of physicalEntries) {
      totalPhysical += entry.physicalCount;
      if (entry.physicalCount !== 1) {
        const asset = await this.prisma.fixedAsset.findUnique({ where: { id: entry.assetId }, select: { name: true } });
        discrepancies.push({ assetId: entry.assetId, name: asset?.name ?? "Unknown", systemCount: 1, physicalCount: entry.physicalCount, diff: entry.physicalCount - 1 });
      }
    }

    return this.prisma.assetVerification.update({
      where: { id: verificationId },
      data: { totalPhysicalCount: physicalEntries.length, discrepancies, status: "COMPLETE" },
    });
  }

  async getVerifications(schoolId: string) {
    return this.prisma.assetVerification.findMany({ where: { schoolId }, orderBy: { verificationDate: "desc" } });
  }
}
