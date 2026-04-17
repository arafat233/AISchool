import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

@Injectable()
export class AlertService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One-click emergency broadcast.
   * In production this fans out to: SMS (AWS SNS), WhatsApp (Twilio), Push (FCM), Voice (Twilio Programmable Voice).
   * Recipients are all school users.
   */
  async broadcastAlert(schoolId: string, data: {
    alertType: string; title: string; message: string; severity?: string; sentBy: string;
  }) {
    // Count total recipients (staff + parents/students linked to this school)
    const staffCount = await this.prisma.staff.count({ where: { schoolId } });
    const studentCount = await this.prisma.student.count({ where: { schoolId } });
    const totalRecipients = staffCount + studentCount;

    const alert = await this.prisma.emergencyAlert.create({
      data: {
        schoolId,
        alertType: data.alertType,
        title: data.title,
        message: data.message,
        severity: data.severity ?? "HIGH",
        status: "SENT",
        sentBy: data.sentBy,
        totalRecipients,
      },
    });

    // Production: dispatch to notification workers for SMS/WhatsApp/Push/Voice
    // This would typically publish to a queue (SQS/RabbitMQ)

    return alert;
  }

  async getAlerts(schoolId: string) {
    return this.prisma.emergencyAlert.findMany({
      where: { schoolId },
      include: { _count: { select: { acknowledgements: true } } },
      orderBy: { sentAt: "desc" },
    });
  }

  async acknowledgeAlert(alertId: string, userId: string) {
    return this.prisma.alertAcknowledgement.upsert({
      where: { alertId_userId: { alertId, userId } },
      create: { alertId, userId },
      update: {},
    });
  }

  async getAcknowledgementStatus(alertId: string) {
    const alert = await this.prisma.emergencyAlert.findUnique({
      where: { id: alertId },
      include: {
        acknowledgements: { include: { alert: { select: { totalRecipients: true } } } },
        _count: { select: { acknowledgements: true } },
      },
    });
    if (!alert) throw new NotFoundError("Alert not found");

    const acknowledged = alert._count.acknowledgements;
    const pending = alert.totalRecipients - acknowledged;

    return {
      alertId,
      totalRecipients: alert.totalRecipients,
      acknowledged,
      pending,
      acknowledgedPercent: alert.totalRecipients > 0
        ? +(acknowledged / alert.totalRecipients * 100).toFixed(1)
        : 0,
    };
  }

  async sendAllClear(alertId: string, message: string) {
    const alert = await this.prisma.emergencyAlert.findUnique({ where: { id: alertId } });
    if (!alert) throw new NotFoundError("Alert not found");

    return this.prisma.emergencyAlert.update({
      where: { id: alertId },
      data: { status: "ALL_CLEAR", allClearAt: new Date(), allClearMessage: message },
    });
  }
}
