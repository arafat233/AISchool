import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";

const DISPOSAL_DAYS = 30;

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── [1] PTA / SMC management ────────────────────────────────────────────
  async addPtaMember(schoolId: string, data: { memberId: string; memberType: string; role: string; electedAt: Date; tenureEndAt?: Date }) {
    return this.prisma.ptaCommitteeMember.create({ data: { schoolId, ...data } });
  }

  async getPtaCommittee(schoolId: string) {
    return this.prisma.ptaCommitteeMember.findMany({ where: { schoolId, isActive: true }, orderBy: { role: "asc" } });
  }

  async createPtaMeeting(schoolId: string, createdBy: string, data: { meetingDate: Date; agenda?: string; resolutions?: object[]; actionItems?: object[] }) {
    return this.prisma.ptaMeeting.create({ data: { schoolId, createdBy, ...data } });
  }

  async updatePtaMeeting(meetingId: string, data: { minutes?: string; resolutions?: object[]; actionItems?: object[] }) {
    return this.prisma.ptaMeeting.update({ where: { id: meetingId }, data });
  }

  async addPtaVote(meetingId: string, topic: string) {
    return this.prisma.ptaVote.create({ data: { meetingId, topic } });
  }

  async castPtaVote(voteId: string, decision: "YES" | "NO" | "ABSTAIN") {
    const field = decision === "YES" ? "yesCount" : decision === "NO" ? "noCount" : "abstainCount";
    return this.prisma.ptaVote.update({ where: { id: voteId }, data: { [field]: { increment: 1 } } });
  }

  async closePtaVote(voteId: string) {
    return this.prisma.ptaVote.update({ where: { id: voteId }, data: { closedAt: new Date() } });
  }

  async recordPtaFundEntry(schoolId: string, data: { entryType: string; amountRs: number; description: string; entryDate: Date; recordedBy: string }) {
    return this.prisma.ptaFundEntry.create({ data: { schoolId, ...data } });
  }

  async getPtaFundBalance(schoolId: string) {
    const entries = await this.prisma.ptaFundEntry.findMany({ where: { schoolId } });
    const receipts = entries.filter((e) => e.entryType === "RECEIPT").reduce((s, e) => s + Number(e.amountRs), 0);
    const payments = entries.filter((e) => e.entryType === "PAYMENT").reduce((s, e) => s + Number(e.amountRs), 0);
    return { receipts, payments, balance: receipts - payments, entries };
  }

  async getPtaMeetings(schoolId: string) {
    return this.prisma.ptaMeeting.findMany({ where: { schoolId }, include: { votes: true }, orderBy: { meetingDate: "desc" } });
  }

  // ─── [2] Parent volunteer management ─────────────────────────────────────
  async registerVolunteer(schoolId: string, parentId: string, skills: string[]) {
    return this.prisma.parentVolunteer.upsert({
      where: { schoolId_parentId: { schoolId, parentId } },
      create: { schoolId, parentId, skills },
      update: { skills },
    });
  }

  async approveVolunteer(volunteerId: string, approvedBy: string) {
    return this.prisma.parentVolunteer.update({ where: { id: volunteerId }, data: { status: "APPROVED", approvedBy } });
  }

  async setBackgroundCheck(volunteerId: string, status: "CLEARED" | "FAILED") {
    return this.prisma.parentVolunteer.update({ where: { id: volunteerId }, data: { backgroundCheckStatus: status } });
  }

  async createVolunteerOpportunity(schoolId: string, createdBy: string, data: { title: string; description?: string; opportunityDate: Date; skillsRequired: string[]; maxVolunteers?: number }) {
    return this.prisma.volunteerOpportunity.create({ data: { schoolId, createdBy, ...data } });
  }

  async applyForOpportunity(opportunityId: string, volunteerId: string) {
    const opp = await this.prisma.volunteerOpportunity.findUnique({ where: { id: opportunityId }, include: { _count: { select: { applications: true } } } });
    if (!opp) throw new NotFoundError("Opportunity not found");
    if (opp.maxVolunteers && (opp as any)._count.applications >= opp.maxVolunteers) throw new ConflictError("Opportunity is full");
    return this.prisma.volunteerApplication.upsert({
      where: { opportunityId_volunteerId: { opportunityId, volunteerId } },
      create: { opportunityId, volunteerId },
      update: {},
    });
  }

  async logVolunteerHours(volunteerId: string, hours: number) {
    return this.prisma.parentVolunteer.update({ where: { id: volunteerId }, data: { hoursLogged: { increment: hours } } });
  }

  async getVolunteers(schoolId: string) {
    return this.prisma.parentVolunteer.findMany({ where: { schoolId }, orderBy: { hoursLogged: "desc" } });
  }

  // ─── [3] Community service tracking ──────────────────────────────────────
  async logCommunityService(schoolId: string, data: { studentId: string; ngoName: string; ngoContact?: string; activityDate: Date; hoursLogged: number; description?: string }) {
    return this.prisma.communityServiceLog.create({ data: { schoolId, ...data } });
  }

  async validateCommunityService(logId: string, validatedBy: string, certificateUrl?: string) {
    return this.prisma.communityServiceLog.update({
      where: { id: logId },
      data: { isValidated: true, validatedBy, certificateUrl },
    });
  }

  async getStudentCommunityHours(schoolId: string, studentId: string) {
    const logs = await this.prisma.communityServiceLog.findMany({ where: { schoolId, studentId, isValidated: true } });
    return { studentId, totalHours: logs.reduce((s, l) => s + l.hoursLogged, 0), logs };
  }

  // ─── [4] Corporate Partnership / CSR ─────────────────────────────────────
  async createPartner(schoolId: string, data: { companyName: string; contactName?: string; contactEmail?: string; contactPhone?: string; csrBudgetRs?: number; focusAreas?: string[]; mouStartDate?: Date; mouEndDate?: Date; mouDocUrl?: string }) {
    return this.prisma.corporatePartner.create({ data: { schoolId, ...data, focusAreas: data.focusAreas ?? [] } });
  }

  async logCsrActivity(partnerId: string, data: { eventId?: string; description: string; activityDate: Date; fundUtilisedRs?: number; impactMetrics?: object }) {
    const act = await this.prisma.csrActivity.create({ data: { partnerId, ...data } });
    // No aggregation needed; utilisation report is computed on read
    return act;
  }

  async getCsrUtilisationReport(partnerId: string) {
    const partner = await this.prisma.corporatePartner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new NotFoundError("Partner not found");
    const activities = await this.prisma.csrActivity.findMany({ where: { partnerId }, orderBy: { activityDate: "desc" } });
    const utilised = activities.reduce((s, a) => s + Number(a.fundUtilisedRs ?? 0), 0);
    const budget = Number(partner.csrBudgetRs ?? 0);
    return { partnerId, companyName: partner.companyName, budget, utilised, remaining: budget - utilised, pct: budget > 0 ? Math.round((utilised / budget) * 100) : 0, activities };
  }

  async getPartners(schoolId: string) {
    return this.prisma.corporatePartner.findMany({ where: { schoolId, status: "ACTIVE" }, include: { _count: { select: { csrActivities: true } } }, orderBy: { companyName: "asc" } });
  }

  // ─── [5] Lost and found ───────────────────────────────────────────────────
  async logFoundItem(schoolId: string, reportedBy: string, data: { description: string; photoUrl?: string; foundLocation?: string; foundAt: Date }) {
    const disposalDate = new Date(data.foundAt.getTime() + DISPOSAL_DAYS * 86_400_000);
    return this.prisma.lostFoundItem.create({ data: { schoolId, reportedBy, disposalDate, ...data } });
  }

  async claimFoundItem(itemId: string, claimantId: string) {
    return this.prisma.lostFoundItem.update({ where: { id: itemId }, data: { claimantId, claimedAt: new Date(), status: "CLAIMED" } });
  }

  async disposeFoundItem(itemId: string) {
    return this.prisma.lostFoundItem.update({ where: { id: itemId }, data: { status: "DISPOSED" } });
  }

  async getUnclaimedItems(schoolId: string) {
    return this.prisma.lostFoundItem.findMany({ where: { schoolId, status: "UNCLAIMED" }, orderBy: { foundAt: "asc" } });
  }

  // ─── [6] School store / bookshop ─────────────────────────────────────────
  async createProduct(schoolId: string, data: { name: string; category: string; sku?: string; description?: string; priceRs: number; stockQty?: number; reorderLevel?: number; sizeVariants?: object[] }) {
    return this.prisma.storeProduct.create({ data: { schoolId, ...data } });
  }

  async updateStock(productId: string, delta: number) {
    const p = await this.prisma.storeProduct.findUnique({ where: { id: productId } });
    if (!p) throw new NotFoundError("Product not found");
    const newStock = p.stockQty + delta;
    if (newStock < 0) throw new ConflictError("Insufficient stock");

    const updated = await this.prisma.storeProduct.update({ where: { id: productId }, data: { stockQty: newStock } });
    if (updated.stockQty <= updated.reorderLevel) {
      console.log(`[STORE] Reorder alert: ${updated.name} (${updated.stockQty} remaining, reorder at ${updated.reorderLevel})`);
    }
    return updated;
  }

  async placeOrder(schoolId: string, data: { customerId: string; customerType: string; items: Array<{ productId: string; qty: number; size?: string; measurements?: object }> }) {
    // Validate stock and calc total
    let total = 0;
    const enriched: Array<{ productId: string; qty: number; size?: string; measurements?: object; unitPriceRs: number }> = [];
    for (const item of data.items) {
      const p = await this.prisma.storeProduct.findUnique({ where: { id: item.productId } });
      if (!p) throw new NotFoundError(`Product ${item.productId} not found`);
      if (p.stockQty < item.qty) throw new ConflictError(`Insufficient stock for ${p.name}`);
      total += Number(p.priceRs) * item.qty;
      enriched.push({ ...item, unitPriceRs: Number(p.priceRs) });
    }

    const order = await this.prisma.storeOrder.create({
      data: {
        schoolId, customerId: data.customerId, customerType: data.customerType, totalAmtRs: total,
        items: { create: enriched.map((i) => ({ productId: i.productId, qty: i.qty, unitPriceRs: i.unitPriceRs, size: i.size, measurements: i.measurements })) },
      },
      include: { items: true },
    });

    // Deduct stock
    await Promise.all(enriched.map((i) => this.prisma.storeProduct.update({ where: { id: i.productId }, data: { stockQty: { decrement: i.qty } } })));

    return order;
  }

  async getProducts(schoolId: string, category?: string) {
    return this.prisma.storeProduct.findMany({
      where: { schoolId, isActive: true, ...(category ? { category } : {}) },
      orderBy: { name: "asc" },
    });
  }

  async getLowStockAlerts(schoolId: string) {
    // Fetch all active products and filter in-memory (Prisma doesn't support column comparisons in where)
    const products = await this.prisma.storeProduct.findMany({ where: { schoolId, isActive: true } });
    return products.filter((p) => p.stockQty <= p.reorderLevel);
  }

  // ─── [7] Robo-call / bulk voice ──────────────────────────────────────────
  async createCallTemplate(schoolId: string, data: { name: string; language?: string; audioUrl?: string; ttsText?: string }) {
    return this.prisma.roboCallTemplate.create({ data: { schoolId, ...data } });
  }

  async dispatchCalls(templateId: string, recipients: Array<{ recipientId: string; recipientPhone: string }>) {
    return this.prisma.roboCallLog.createMany({
      data: recipients.map((r) => ({ templateId, ...r })),
    });
  }

  async updateCallStatus(logId: string, status: "ANSWERED" | "NOT_ANSWERED" | "FAILED") {
    return this.prisma.roboCallLog.update({ where: { id: logId }, data: { status, deliveredAt: status === "ANSWERED" ? new Date() : undefined } });
  }

  async getCallDeliveryStatus(templateId: string) {
    const logs = await this.prisma.roboCallLog.findMany({ where: { templateId } });
    const answered = logs.filter((l) => l.status === "ANSWERED").length;
    const notAnswered = logs.filter((l) => l.status === "NOT_ANSWERED").length;
    const failed = logs.filter((l) => l.status === "FAILED").length;
    const pending = logs.filter((l) => l.status === "PENDING").length;
    return { total: logs.length, answered, notAnswered, failed, pending, deliveryRate: logs.length > 0 ? Math.round((answered / logs.length) * 100) : 0 };
  }

  // ─── [8] Digital signage ──────────────────────────────────────────────────
  async createSignageContent(schoolId: string, createdBy: string, data: { title: string; contentType: string; content: object; screens: string[]; startAt: Date; endAt: Date; isEmergency?: boolean }) {
    return this.prisma.digitalSignageContent.create({ data: { schoolId, createdBy, ...data } });
  }

  async emergencyOverrideAllScreens(schoolId: string, createdBy: string, message: string) {
    const allScreens = ["*"]; // wildcard — display layer handles broadcast
    return this.prisma.digitalSignageContent.create({
      data: {
        schoolId, createdBy,
        title: "EMERGENCY BROADCAST",
        contentType: "ANNOUNCEMENT",
        content: { text: message },
        screens: allScreens,
        startAt: new Date(),
        endAt: new Date(Date.now() + 3_600_000),
        isEmergency: true,
      },
    });
  }

  async getActiveSignageContent(schoolId: string, screenId?: string) {
    const now = new Date();
    return this.prisma.digitalSignageContent.findMany({
      where: {
        schoolId, startAt: { lte: now }, endAt: { gte: now },
        ...(screenId ? { OR: [{ screens: { has: screenId } }, { screens: { has: "*" } }] } : {}),
      },
      orderBy: [{ isEmergency: "desc" }, { startAt: "asc" }],
    });
  }
}
