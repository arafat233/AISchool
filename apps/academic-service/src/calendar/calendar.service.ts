import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(schoolId: string, data: {
    title: string; description?: string; date: Date; endDate?: Date;
    type: string; isHoliday?: boolean; targetRoles?: string[]; createdBy: string;
  }) {
    return this.prisma.academicCalendarEvent.create({
      data: { schoolId, ...data, targetRoles: data.targetRoles ?? [] },
    });
  }

  async getEvents(schoolId: string, fromDate?: Date, toDate?: Date, type?: string) {
    return this.prisma.academicCalendarEvent.findMany({
      where: {
        schoolId,
        ...(type ? { type } : {}),
        ...(fromDate || toDate ? {
          date: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        } : {}),
      },
      orderBy: { date: "asc" },
    });
  }

  async updateEvent(id: string, data: any) {
    return this.prisma.academicCalendarEvent.update({ where: { id }, data });
  }

  async deleteEvent(id: string) {
    return this.prisma.academicCalendarEvent.delete({ where: { id } });
  }

  // ─── iCal export ─────────────────────────────────────────────────────────────

  async generateICal(schoolId: string) {
    const events = await this.prisma.academicCalendarEvent.findMany({
      where: { schoolId },
      orderBy: { date: "asc" },
    });

    const formatDt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const ical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//AISchool//Academic Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events.flatMap((ev) => [
        "BEGIN:VEVENT",
        `UID:${ev.id}@aischool`,
        `DTSTART:${formatDt(ev.date)}`,
        ev.endDate ? `DTEND:${formatDt(ev.endDate)}` : `DTEND:${formatDt(ev.date)}`,
        `SUMMARY:${ev.title}`,
        ev.description ? `DESCRIPTION:${ev.description.replace(/\n/g, "\\n")}` : "",
        `CATEGORIES:${ev.type}`,
        "END:VEVENT",
      ].filter(Boolean)),
      "END:VCALENDAR",
    ].join("\r\n");

    return ical;
  }

  // ─── Working day calculator ───────────────────────────────────────────────────

  async calculateWorkingDays(schoolId: string, fromDate: Date, toDate: Date) {
    const holidays = await this.prisma.academicCalendarEvent.findMany({
      where: { schoolId, isHoliday: true, date: { gte: fromDate, lte: toDate } },
      select: { date: true },
    });

    const holidaySet = new Set(holidays.map((h) => h.date.toDateString()));

    let working = 0;
    const current = new Date(fromDate);
    while (current <= toDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6 && !holidaySet.has(current.toDateString())) {
        working++;
      }
      current.setDate(current.getDate() + 1);
    }

    return { fromDate, toDate, workingDays: working, holidayCount: holidaySet.size };
  }
}
