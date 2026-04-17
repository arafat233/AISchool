import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";
import * as crypto from "crypto";

const BLACKLIST = new Set<string>(); // Production: persistent DB table or Redis set

@Injectable()
export class VisitorService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Visitor registration ─────────────────────────────────────────────────────

  async registerVisitor(schoolId: string, data: {
    visitorName: string; visitorPhone?: string; visitorIdType?: string; visitorIdNo?: string;
    photoUrl?: string; purpose: string; hostName?: string; hostDepartment?: string;
    passType?: string; createdBy: string;
  }) {
    // Blacklist check
    if (data.visitorIdNo && BLACKLIST.has(data.visitorIdNo)) {
      throw new ConflictError("Visitor ID is on the blacklist. Entry denied.");
    }

    const passNo = `VIS-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const visitor = await this.prisma.visitorLog.create({
      data: {
        schoolId,
        visitorName: data.visitorName,
        visitorPhone: data.visitorPhone,
        visitorIdType: data.visitorIdType,
        visitorIdNo: data.visitorIdNo,
        photoUrl: data.photoUrl,
        purpose: data.purpose,
        hostName: data.hostName,
        hostDepartment: data.hostDepartment,
        passNo,
        passType: data.passType ?? "VISITOR",
        status: "ACTIVE",
        createdBy: data.createdBy,
      },
    });

    // Production: send push notification to host staff for approval
    console.log(`[VISITOR] Host notification: ${data.hostName} — visitor ${data.visitorName} awaiting approval`);

    return { ...visitor, qrPayload: JSON.stringify({ passNo, visitorId: visitor.id, schoolId }) };
  }

  async getVisitors(schoolId: string, date?: Date) {
    const start = date ? new Date(date.setHours(0, 0, 0, 0)) : undefined;
    const end = date ? new Date(date.setHours(23, 59, 59, 999)) : undefined;
    return this.prisma.visitorLog.findMany({
      where: {
        schoolId,
        ...(start && end ? { checkinAt: { gte: start, lte: end } } : {}),
      },
      orderBy: { checkinAt: "desc" },
    });
  }

  async checkoutVisitor(visitorId: string) {
    return this.prisma.visitorLog.update({
      where: { id: visitorId },
      data: { checkoutAt: new Date(), status: "CHECKED_OUT" },
    });
  }

  async getVisitorByPass(passNo: string) {
    const v = await this.prisma.visitorLog.findUnique({ where: { passNo } });
    if (!v) throw new NotFoundError("Visitor pass not found");
    return v;
  }

  // ─── Blacklist ────────────────────────────────────────────────────────────────

  async addToBlacklist(idNo: string) {
    BLACKLIST.add(idNo);
    return { blacklisted: idNo };
  }

  async removeFromBlacklist(idNo: string) {
    BLACKLIST.delete(idNo);
    return { removed: idNo };
  }

  // ─── Student gate pass ────────────────────────────────────────────────────────

  async requestGatePass(schoolId: string, data: {
    studentId: string; reason: string; expectedReturnTime?: Date; issuedBy: string;
  }) {
    return this.prisma.studentGatePass.create({
      data: { schoolId, ...data, expectedReturnTime: data.expectedReturnTime },
    });
  }

  async approveGatePass(gatePassId: string) {
    return this.prisma.studentGatePass.update({
      where: { id: gatePassId },
      data: { parentApproved: true, parentApprovedAt: new Date(), exitTime: new Date() },
    });
  }

  async recordGatePassReturn(gatePassId: string) {
    return this.prisma.studentGatePass.update({
      where: { id: gatePassId },
      data: { actualReturnTime: new Date() },
    });
  }

  async getGatePasses(schoolId: string, studentId?: string) {
    return this.prisma.studentGatePass.findMany({
      where: { schoolId, ...(studentId ? { studentId } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  // ─── Delivery management ──────────────────────────────────────────────────────

  async logDelivery(schoolId: string, data: {
    description: string; recipient: string; createdBy: string;
  }) {
    // Stored as a DELIVERY type visitor log
    const passNo = `DEL-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    return this.prisma.visitorLog.create({
      data: {
        schoolId,
        visitorName: `Delivery: ${data.description}`,
        purpose: `Delivery for ${data.recipient}`,
        hostName: data.recipient,
        passNo,
        passType: "DELIVERY",
        status: "ACTIVE",
        createdBy: data.createdBy,
      },
    });
  }

  async markDeliveryCollected(visitorId: string) {
    return this.prisma.visitorLog.update({
      where: { id: visitorId },
      data: { checkoutAt: new Date(), status: "CHECKED_OUT" },
    });
  }
}
