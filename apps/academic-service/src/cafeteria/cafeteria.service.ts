import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";

const LOW_BALANCE_DEFAULT = 100;
const ORDER_CUTOFF_HOUR = 20; // 8 PM

@Injectable()
export class CafeteriaService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Menu management ──────────────────────────────────────────────────── [1/8]

  async createMenuItem(schoolId: string, data: {
    name: string; description?: string; mealType?: string; category?: string;
    priceRs: number; calories?: number; proteinG?: number; carbsG?: number;
    fatG?: number; sugarG?: number; sodiumMg?: number;
    allergens?: string[]; imageUrl?: string;
  }) {
    return this.prisma.menuItem.create({ data: { schoolId, ...data } });
  }

  async getMenuItems(schoolId: string, mealType?: string) {
    return this.prisma.menuItem.findMany({
      where: { schoolId, isAvailable: true, ...(mealType ? { mealType } : {}) },
      orderBy: { name: "asc" },
    });
  }

  async publishDayMenu(schoolId: string, date: Date, items: { menuItemId: string; quantity?: number }[], createdBy: string) {
    const day = await this.prisma.menuDay.upsert({
      where: { schoolId_date: { schoolId, date } },
      create: { schoolId, date, createdBy, publishedAt: new Date() },
      update: { publishedAt: new Date() },
    });
    // Replace items
    await this.prisma.menuDayItem.deleteMany({ where: { menuDayId: day.id } });
    await this.prisma.menuDayItem.createMany({
      data: items.map((i) => ({ menuDayId: day.id, menuItemId: i.menuItemId, quantity: i.quantity })),
    });
    return this.prisma.menuDay.findUnique({ where: { id: day.id }, include: { items: { include: { menuItem: true } } } });
  }

  async getDayMenu(schoolId: string, date: Date) {
    return this.prisma.menuDay.findUnique({
      where: { schoolId_date: { schoolId, date } },
      include: { items: { include: { menuItem: true } } },
    });
  }

  // ─── Pre-order system ─────────────────────────────────────────────────── [2/8]

  async placeOrder(schoolId: string, studentId: string, orderDate: Date, items: { menuItemId: string; quantity: number }[]) {
    // Enforce 8 PM cutoff for next-day orders
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setHours(ORDER_CUTOFF_HOUR, 0, 0, 0);
    const isNextDay = orderDate.toDateString() === new Date(now.getTime() + 86400_000).toDateString();
    if (isNextDay && now > cutoff) {
      throw new ConflictError("Order cutoff time (8 PM) has passed for tomorrow's meals.");
    }

    // Fetch prices
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: items.map((i) => i.menuItemId) } },
    });
    const priceMap = new Map(menuItems.map((m) => [m.id, m.priceRs]));
    const total = items.reduce((sum, i) => sum + (priceMap.get(i.menuItemId) ?? 0) * i.quantity, 0);

    // Check wallet balance
    const wallet = await this.prisma.studentWallet.findUnique({ where: { studentId } });
    if (!wallet || wallet.balanceRs < total) {
      throw new ConflictError(`Insufficient wallet balance. Required: ₹${total}, Available: ₹${wallet?.balanceRs ?? 0}`);
    }

    const receiptNo = `CAF-${Date.now()}`;

    const order = await this.prisma.cafeteriaOrder.create({
      data: {
        schoolId, studentId, orderDate,
        status: "CONFIRMED",
        totalAmount: total,
        paidFromWallet: true,
        receiptNo,
        items: {
          create: items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            unitPrice: priceMap.get(i.menuItemId) ?? 0,
          })),
        },
      },
      include: { items: { include: { menuItem: true } } },
    });

    // Deduct wallet
    await this.prisma.studentWallet.update({
      where: { studentId },
      data: { balanceRs: { decrement: total } },
    });
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEBIT",
        amountRs: total,
        description: `Cafeteria order ${receiptNo}`,
        referenceId: order.id,
      },
    });

    // Low balance alert
    const updatedWallet = await this.prisma.studentWallet.findUnique({ where: { studentId } });
    if (updatedWallet && updatedWallet.balanceRs < updatedWallet.lowBalanceThreshold) {
      console.log(`[WALLET ALERT] Student ${studentId} wallet low: ₹${updatedWallet.balanceRs}`);
      // Production: push to parent
    }

    return order;
  }

  // ─── Allergen filter at POS ───────────────────────────────────────────── [3/8]

  async posCheckAllergens(studentId: string, menuItemId: string) {
    const [profile, item] = await Promise.all([
      this.prisma.studentMedicalProfile.findUnique({ where: { studentId } }),
      this.prisma.menuItem.findUnique({ where: { id: menuItemId } }),
    ]);
    if (!item) throw new NotFoundError("Menu item not found");

    const studentAllergens: string[] = (profile?.allergies as any[])?.map((a: any) => a.allergen?.toUpperCase()) ?? [];
    const itemAllergens: string[] = item.allergens ?? [];
    const conflicts = itemAllergens.filter((a) => studentAllergens.includes(a));

    return {
      menuItemId,
      itemName: item.name,
      safe: conflicts.length === 0,
      conflicts,
      warning: conflicts.length > 0
        ? `⚠️ ALLERGEN WARNING: ${conflicts.join(", ")} detected for this student!`
        : null,
    };
  }

  // ─── Student wallet ───────────────────────────────────────────────────── [4/8]

  async getOrCreateWallet(studentId: string) {
    return this.prisma.studentWallet.upsert({
      where: { studentId },
      create: { studentId, balanceRs: 0, lowBalanceThreshold: LOW_BALANCE_DEFAULT },
      update: {},
      include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
  }

  async topUpWallet(studentId: string, amountRs: number, referenceId?: string) {
    const wallet = await this.prisma.studentWallet.upsert({
      where: { studentId },
      create: { studentId, balanceRs: amountRs },
      update: { balanceRs: { increment: amountRs } },
    });
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "CREDIT",
        amountRs,
        description: "Wallet top-up",
        referenceId,
      },
    });
    return this.prisma.studentWallet.findUnique({ where: { studentId } });
  }

  async setLowBalanceThreshold(studentId: string, threshold: number) {
    return this.prisma.studentWallet.update({
      where: { studentId },
      data: { lowBalanceThreshold: threshold },
    });
  }

  // ─── POS billing (scan QR → deduct wallet) ───────────────────────────── [5/8]

  async posBill(schoolId: string, studentId: string, items: { menuItemId: string; quantity: number }[]) {
    // Same as placeOrder but immediate (no cutoff check — this is at the counter)
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: items.map((i) => i.menuItemId) } },
    });
    const priceMap = new Map(menuItems.map((m) => [m.id, m.priceRs]));
    const total = items.reduce((sum, i) => sum + (priceMap.get(i.menuItemId) ?? 0) * i.quantity, 0);

    const wallet = await this.prisma.studentWallet.findUnique({ where: { studentId } });
    if (!wallet || wallet.balanceRs < total) {
      throw new ConflictError(`Insufficient balance. Required: ₹${total}, Available: ₹${wallet?.balanceRs ?? 0}`);
    }

    // Allergen check for all items
    const allergenWarnings: string[] = [];
    for (const item of items) {
      const check = await this.posCheckAllergens(studentId, item.menuItemId);
      if (!check.safe) allergenWarnings.push(check.warning!);
    }

    const receiptNo = `POS-${Date.now()}`;
    const order = await this.prisma.cafeteriaOrder.create({
      data: {
        schoolId, studentId, orderDate: new Date(),
        status: "DELIVERED",
        totalAmount: total,
        paidFromWallet: true,
        receiptNo,
        items: {
          create: items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            unitPrice: priceMap.get(i.menuItemId) ?? 0,
          })),
        },
      },
      include: { items: { include: { menuItem: true } } },
    });

    await this.prisma.studentWallet.update({
      where: { studentId },
      data: { balanceRs: { decrement: total } },
    });
    await this.prisma.walletTransaction.create({
      data: { walletId: wallet.id, type: "DEBIT", amountRs: total, description: `POS ${receiptNo}`, referenceId: order.id },
    });

    return { order, receiptNo, totalAmount: total, allergenWarnings };
  }

  // ─── Kitchen order summary ────────────────────────────────────────────── [6/8]

  async getKitchenSummary(schoolId: string, date: Date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end   = new Date(date); end.setHours(23, 59, 59, 999);

    const orders = await this.prisma.cafeteriaOrder.findMany({
      where: { schoolId, orderDate: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      include: { items: { include: { menuItem: true } } },
    });

    const summary: Record<string, { name: string; quantity: number; mealType: string }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (!summary[item.menuItemId]) {
          summary[item.menuItemId] = { name: item.menuItem.name, quantity: 0, mealType: item.menuItem.mealType };
        }
        summary[item.menuItemId].quantity += item.quantity;
      }
    }

    return {
      date, totalOrders: orders.length,
      items: Object.values(summary).sort((a, b) => b.quantity - a.quantity),
    };
  }

  // ─── Monthly nutritional analysis ────────────────────────────────────── [7/8]

  async getNutritionalAnalysis(schoolId: string, studentId: string, month: string) {
    // month format: "2026-04"
    const [year, mon] = month.split("-").map(Number);
    const start = new Date(year, mon - 1, 1);
    const end   = new Date(year, mon, 0, 23, 59, 59);

    const orders = await this.prisma.cafeteriaOrder.findMany({
      where: { schoolId, studentId, orderDate: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      include: { items: { include: { menuItem: true } } },
    });

    let totalCalories = 0, totalSugarG = 0, totalSodiumMg = 0, totalProteinG = 0, totalCarbsG = 0, totalFatG = 0;
    let mealCount = 0;

    for (const order of orders) {
      for (const item of order.items) {
        const m = item.menuItem;
        totalCalories  += (m.calories  ?? 0) * item.quantity;
        totalSugarG    += (m.sugarG    ?? 0) * item.quantity;
        totalSodiumMg  += (m.sodiumMg  ?? 0) * item.quantity;
        totalProteinG  += (m.proteinG  ?? 0) * item.quantity;
        totalCarbsG    += (m.carbsG    ?? 0) * item.quantity;
        totalFatG      += (m.fatG      ?? 0) * item.quantity;
        mealCount++;
      }
    }

    const flags: string[] = [];
    if (totalSugarG   > 600)   flags.push(`High sugar: ${totalSugarG.toFixed(1)}g (recommended < 600g/month)`);
    if (totalSodiumMg > 60000) flags.push(`High sodium: ${(totalSodiumMg / 1000).toFixed(1)}g (recommended < 60g/month)`);

    return {
      studentId, month, mealCount, totalOrders: orders.length,
      nutrition: { calories: +totalCalories.toFixed(0), sugarG: +totalSugarG.toFixed(1), sodiumMg: +totalSodiumMg.toFixed(0), proteinG: +totalProteinG.toFixed(1), carbsG: +totalCarbsG.toFixed(1), fatG: +totalFatG.toFixed(1) },
      flags,
    };
  }

  // ─── FSSAI compliance ─────────────────────────────────────────────────── [8/8]

  async upsertFssai(schoolId: string, data: {
    licenseNo: string; licenseExpiry: Date; operatorName?: string;
    waterTestDate?: Date; waterTestResult?: string;
  }) {
    return this.prisma.fssaiRecord.upsert({
      where: { schoolId },
      create: { schoolId, ...data },
      update: data,
    });
  }

  async getFssai(schoolId: string) {
    return this.prisma.fssaiRecord.findUnique({
      where: { schoolId },
      include: { staffCertificates: true, safetyChecklists: { orderBy: { completedAt: "desc" } }, sampleLogs: { orderBy: { sampleDate: "desc" }, take: 10 } },
    });
  }

  async addFssaiStaffCert(schoolId: string, data: { staffName: string; certNo?: string; issuedOn?: Date; expiresOn?: Date }) {
    const fssai = await this.prisma.fssaiRecord.findUnique({ where: { schoolId } });
    if (!fssai) throw new NotFoundError("FSSAI record not found");
    return this.prisma.fssaiStaffCertificate.create({ data: { fssaiId: fssai.id, ...data } });
  }

  async submitSafetyChecklist(schoolId: string, month: string, items: { check: string; passed: boolean; notes?: string }[], completedBy: string) {
    const fssai = await this.prisma.fssaiRecord.findUnique({ where: { schoolId } });
    if (!fssai) throw new NotFoundError("FSSAI record not found");
    return this.prisma.foodSafetyChecklist.upsert({
      where: { fssaiId_month: { fssaiId: fssai.id, month } },
      create: { fssaiId: fssai.id, month, items, completedBy },
      update: { items, completedBy, completedAt: new Date() },
    });
  }

  async logFoodSample(schoolId: string, data: { sampleDate: Date; mealType: string; items: string[]; retainedUntil: Date; notes?: string }) {
    const fssai = await this.prisma.fssaiRecord.findUnique({ where: { schoolId } });
    if (!fssai) throw new NotFoundError("FSSAI record not found");
    return this.prisma.foodSampleLog.create({ data: { fssaiId: fssai.id, ...data } });
  }
}
