import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

@Injectable()
export class StaffCommsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Staff circulars (notice board) ──────────────────────────────────────────

  async publishCircular(schoolId: string, data: {
    title: string; body: string; attachmentUrl?: string;
    targetDepartment?: string; targetGradeLevel?: string;
    isMandatoryRead?: boolean; publishedBy: string;
  }) {
    return this.prisma.staffCircular.create({
      data: {
        schoolId,
        title: data.title,
        body: data.body,
        attachmentUrl: data.attachmentUrl,
        targetDepartment: data.targetDepartment,
        targetGradeLevel: data.targetGradeLevel,
        isManadatoryRead: data.isMandatoryRead ?? true,
        publishedBy: data.publishedBy,
      },
    });
  }

  async getCirculars(schoolId: string, department?: string) {
    return this.prisma.staffCircular.findMany({
      where: { schoolId, ...(department ? { targetDepartment: department } : {}) },
      include: { _count: { select: { readReceipts: true } } },
      orderBy: { publishedAt: "desc" },
    });
  }

  async markRead(circularId: string, staffId: string) {
    return this.prisma.circularReadReceipt.upsert({
      where: { circularId_staffId: { circularId, staffId } },
      create: { circularId, staffId },
      update: {},
    });
  }

  async getReadStatus(circularId: string) {
    const circular = await this.prisma.staffCircular.findUnique({
      where: { id: circularId },
      include: {
        readReceipts: { include: { circular: { select: { schoolId: true } } } },
        _count: { select: { readReceipts: true } },
      },
    });
    if (!circular) throw new NotFoundError("Circular not found");

    // Count total eligible staff
    const totalStaff = await this.prisma.staff.count({ where: { schoolId: circular.schoolId } });
    const readCount = circular._count.readReceipts;

    return {
      circularId,
      totalStaff,
      readCount,
      pendingCount: totalStaff - readCount,
      readPercent: totalStaff > 0 ? +(readCount / totalStaff * 100).toFixed(1) : 0,
    };
  }

  // ─── Direct messaging (staff ↔ staff) ────────────────────────────────────────

  async sendMessage(schoolId: string, senderId: string, receiverId: string, message: string) {
    return this.prisma.staffDirectMessage.create({
      data: { schoolId, senderId, receiverId, message },
    });
  }

  async getConversation(schoolId: string, userA: string, userB: string) {
    return this.prisma.staffDirectMessage.findMany({
      where: {
        schoolId,
        OR: [
          { senderId: userA, receiverId: userB },
          { senderId: userB, receiverId: userA },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async markMessagesRead(schoolId: string, senderId: string, receiverId: string) {
    return this.prisma.staffDirectMessage.updateMany({
      where: { schoolId, senderId, receiverId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // Admin oversight: flag a message
  async flagMessage(messageId: string) {
    return this.prisma.staffDirectMessage.update({
      where: { id: messageId },
      data: { flaggedByAdmin: true },
    });
  }

  async getInbox(schoolId: string, userId: string) {
    // Get latest message per conversation
    const messages = await this.prisma.staffDirectMessage.findMany({
      where: { schoolId, OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: "desc" },
    });

    const seen = new Set<string>();
    const conversations: typeof messages = [];
    for (const m of messages) {
      const key = [m.senderId, m.receiverId].sort().join("-");
      if (!seen.has(key)) {
        seen.add(key);
        conversations.push(m);
      }
    }
    return conversations;
  }
}
