import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";

@Injectable()
export class PtmService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── PTM event creation ───────────────────────────────────────────────────────

  async createEvent(schoolId: string, data: {
    title: string; eventDate: Date; slotDurationMinutes: number;
    isVirtual?: boolean; meetingPlatform?: string; venue?: string;
    createdBy: string;
  }) {
    return this.prisma.ptmEvent.create({
      data: {
        schoolId, title: data.title, eventDate: data.eventDate,
        slotDurationMinutes: data.slotDurationMinutes,
        isVirtual: data.isVirtual ?? false,
        meetingPlatform: data.meetingPlatform,
        venue: data.venue,
        createdBy: data.createdBy,
        status: "SCHEDULED",
      },
    });
  }

  async getPtmEvents(schoolId: string) {
    return this.prisma.ptmEvent.findMany({
      where: { schoolId },
      orderBy: { eventDate: "desc" },
    });
  }

  // ─── Teacher slot setup ───────────────────────────────────────────────────────

  async setupTeacherSlots(ptmEventId: string, staffId: string, data: {
    startTime: Date; endTime: Date;
  }) {
    const event = await this.prisma.ptmEvent.findUnique({ where: { id: ptmEventId } });
    if (!event) throw new NotFoundError("PTM event not found");

    // Auto-generate slots
    const slots: any[] = [];
    const current = new Date(data.startTime);
    const end = new Date(data.endTime);

    while (current < end) {
      const slotEnd = new Date(current.getTime() + event.slotDurationMinutes * 60000);
      if (slotEnd > end) break;

      await this.prisma.ptmSlot.create({
        data: {
          ptmEventId, staffId,
          startTime: new Date(current),
          endTime: new Date(slotEnd),
          isBooked: false,
        },
      });
      slots.push({ start: new Date(current), end: new Date(slotEnd) });
      current.setTime(slotEnd.getTime());
    }

    return { slotsCreated: slots.length, slots };
  }

  async getTeacherSlots(ptmEventId: string, staffId?: string) {
    return this.prisma.ptmSlot.findMany({
      where: { ptmEventId, ...(staffId ? { staffId } : {}) },
      include: { staff: { include: { user: { include: { profile: true } } } } },
      orderBy: [{ staffId: "asc" }, { startTime: "asc" }],
    });
  }

  // ─── Parent slot booking ──────────────────────────────────────────────────────

  async bookSlot(slotId: string, data: {
    parentId: string; studentId: string; notes?: string;
  }) {
    const slot = await this.prisma.ptmSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new NotFoundError("Slot not found");
    if (slot.isBooked) throw new ConflictError("Slot already booked");

    const booking = await this.prisma.ptmBooking.create({
      data: {
        slotId, parentId: data.parentId, studentId: data.studentId,
        notes: data.notes, status: "CONFIRMED",
      },
    });

    await this.prisma.ptmSlot.update({ where: { id: slotId }, data: { isBooked: true } });

    return booking;
  }

  async cancelBooking(bookingId: string) {
    const booking = await this.prisma.ptmBooking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });
    await this.prisma.ptmSlot.update({ where: { id: booking.slotId }, data: { isBooked: false } });
    return booking;
  }

  // ─── Teacher schedule view ────────────────────────────────────────────────────

  async getTeacherSchedule(ptmEventId: string, staffId: string) {
    return this.prisma.ptmSlot.findMany({
      where: { ptmEventId, staffId },
      include: {
        booking: {
          include: {
            student: { include: { user: { include: { profile: true } } } },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });
  }

  // ─── Visitor QR pre-registration ─────────────────────────────────────────────

  async getBookingQR(bookingId: string) {
    const booking = await this.prisma.ptmBooking.findUnique({
      where: { id: bookingId },
      include: { slot: { include: { staff: { include: { user: { include: { profile: true } } } } } } },
    });
    if (!booking) throw new NotFoundError("Booking not found");

    // Return booking info to generate QR on client side (gate scan)
    return {
      bookingId,
      qrPayload: JSON.stringify({ bookingId, status: "CONFIRMED", slotId: booking.slotId }),
      slotTime: (booking.slot as any).startTime,
      teacherName: `${(booking.slot as any).staff?.user?.profile?.firstName ?? ""} ${(booking.slot as any).staff?.user?.profile?.lastName ?? ""}`.trim(),
    };
  }

  // ─── Post-PTM remarks ─────────────────────────────────────────────────────────

  async addRemarks(bookingId: string, teacherStaffId: string, remarks: string) {
    return this.prisma.ptmBooking.update({
      where: { id: bookingId },
      data: { teacherRemarks: remarks, remarksAddedBy: teacherStaffId, remarksAddedAt: new Date() },
    });
  }

  async getRemarks(bookingId: string) {
    return this.prisma.ptmBooking.findUnique({
      where: { id: bookingId },
      select: { teacherRemarks: true, remarksAddedAt: true },
    });
  }
}
