import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { v4 as uuidv4 } from "uuid";

/**
 * 3-tier support:
 *  Tier 1: AI chatbot (simulated) — auto-closes common queries
 *  Tier 2: Agent with SLA per plan
 *  Tier 3: Engineering — linked to critical issues
 *
 * SLA by plan (first response time):
 *  BASIC:      48h
 *  STANDARD:   24h
 *  PREMIUM:    8h
 *  ENTERPRISE: 2h
 */
const SLA_HOURS: Record<string, number> = { BASIC: 48, STANDARD: 24, PREMIUM: 8, ENTERPRISE: 2 };

const AI_AUTO_RESOLVE_KEYWORDS = ["password reset", "forgot password", "invoice download", "how to", "what is", "user guide"];

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(tenantId: string, dto: { subject: string; description: string; priority?: string }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const slaHours = SLA_HOURS[tenant?.plan ?? "BASIC"];
    const slaDeadline = new Date(Date.now() + slaHours * 3_600_000);

    // Tier 1: AI auto-resolve check
    const lc = dto.description.toLowerCase();
    const isAutoResolvable = AI_AUTO_RESOLVE_KEYWORDS.some((kw) => lc.includes(kw));

    const ticket = await this.prisma.supportTicket.create({
      data: {
        id: uuidv4(),
        tenantId,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority ?? "MEDIUM",
        status: isAutoResolvable ? "AI_RESOLVED" : "OPEN",
        tier: isAutoResolvable ? 1 : 2,
        slaDeadline,
        aiResponse: isAutoResolvable
          ? "Hi! This appears to be a common question. Please visit our Help Center at https://help.schoolerp.com or use the step-by-step guide in Settings → Help. If the issue persists, reply here to escalate to a support agent."
          : null,
      },
    });
    return ticket;
  }

  async listTickets(tenantId?: string, status?: string) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    return this.prisma.supportTicket.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  async getTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    return ticket;
  }

  async addReply(id: string, dto: { message: string; authorEmail: string; isAgent?: boolean }) {
    const ticket = await this.getTicket(id);
    const reply = await this.prisma.supportTicketReply.create({
      data: { ticketId: id, message: dto.message, authorEmail: dto.authorEmail, isAgent: dto.isAgent ?? false },
    });

    // Update ticket status on first agent reply
    if (dto.isAgent && ticket.status === "OPEN") {
      await this.prisma.supportTicket.update({ where: { id }, data: { status: "IN_PROGRESS", firstResponseAt: new Date() } });
    }

    return reply;
  }

  async closeTicket(id: string, resolution: string) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: { status: "CLOSED", resolution, closedAt: new Date() },
    });
  }

  async escalateToEngineering(id: string, sentryIssueUrl?: string) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: { tier: 3, status: "ESCALATED", sentryIssueUrl },
    });
  }
}
