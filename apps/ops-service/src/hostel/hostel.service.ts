/**
 * Hostel / Boarding School Module
 *
 * Room management, student allotment, warden assignment,
 * daily night roll call, mess management, leave/outing,
 * visitor log, incident register, staff quarters.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface RoomAllotment {
  studentId: string;
  roomId: string;
  bedNo: string;
  academicYearId: string;
  checkInDate: Date;
  mealPlan: "VEG" | "NON_VEG" | "JAIN" | "VEGAN";
  allergens: string[];
}

export type HostelAttendanceStatus = "IN_HOSTEL" | "WEEKEND_LEAVE" | "HOLIDAY_LEAVE" | "MEDICAL_LEAVE" | "UNAUTHORISED_ABSENT";

@Injectable()
export class HostelService {
  private readonly logger = new Logger(HostelService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Room Management ───────────────────────────────────────────────────────

  async getRooms(schoolId: string, blockId?: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT r.*,
             COUNT(ra.id) AS occupied_beds,
             r.capacity - COUNT(ra.id) AS available_beds
      FROM hostel_rooms r
      LEFT JOIN hostel_allotments ra ON ra.room_id = r.id AND ra.status = 'ACTIVE'
      WHERE r.school_id = ${schoolId}
        AND (${blockId ?? null} IS NULL OR r.block_id = ${blockId ?? null})
      GROUP BY r.id
      ORDER BY r.block_id, r.floor, r.room_no
    `;
  }

  async allotBed(allotment: RoomAllotment): Promise<void> {
    // Check bed availability
    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM hostel_allotments
      WHERE room_id = ${allotment.roomId} AND bed_no = ${allotment.bedNo} AND status = 'ACTIVE'
    `;
    if (existing.length > 0) throw new Error("Bed already occupied");

    await this.prisma.$executeRaw`
      INSERT INTO hostel_allotments (
        student_id, room_id, bed_no, academic_year_id, check_in_date,
        meal_plan, allergens, status, allotment_letter_generated, created_at
      )
      VALUES (
        ${allotment.studentId}, ${allotment.roomId}, ${allotment.bedNo},
        ${allotment.academicYearId}, ${allotment.checkInDate},
        ${allotment.mealPlan}, ${JSON.stringify(allotment.allergens)},
        'ACTIVE', false, NOW()
      )
    `;
    this.logger.log(`Bed allotted: student ${allotment.studentId} → room ${allotment.roomId} bed ${allotment.bedNo}`);
  }

  async generateAllotmentLetter(allotmentId: string): Promise<string> {
    await this.prisma.$executeRaw`
      UPDATE hostel_allotments SET allotment_letter_generated = true WHERE id = ${allotmentId}
    `;
    return `allotment_letter_${allotmentId}.pdf`; // in production: generate PDF
  }

  // ── Daily Roll Call ────────────────────────────────────────────────────────

  async recordNightRollCall(schoolId: string, date: Date, records: { studentId: string; status: HostelAttendanceStatus }[]): Promise<void> {
    for (const r of records) {
      await this.prisma.$executeRaw`
        INSERT INTO hostel_attendance (school_id, student_id, date, status, recorded_at)
        VALUES (${schoolId}, ${r.studentId}, ${date}, ${r.status}, NOW())
        ON CONFLICT (school_id, student_id, date) DO UPDATE SET status = ${r.status}, recorded_at = NOW()
      `;
    }
    this.logger.log(`Night roll call recorded: ${records.length} students, date ${date.toDateString()}`);
  }

  async getRollCallReport(schoolId: string, date: Date): Promise<any> {
    const records = await this.prisma.$queryRaw<any[]>`
      SELECT ha.status, COUNT(*) AS count
      FROM hostel_attendance ha
      WHERE ha.school_id = ${schoolId} AND ha.date = ${date}
      GROUP BY ha.status
    `;
    return { date, counts: records, reportedAt: new Date() };
  }

  // ── Mess / Dining Management ──────────────────────────────────────────────

  async recordMessBill(schoolId: string, studentId: string, month: number, year: number, billData: {
    daysPresent: number;
    ratePerDay: number;
    extraCharges: number;
    discounts: number;
  }): Promise<void> {
    const total = billData.daysPresent * billData.ratePerDay + billData.extraCharges - billData.discounts;

    await this.prisma.$executeRaw`
      INSERT INTO hostel_mess_bills (school_id, student_id, month, year, days_present, rate_per_day,
                                     extra_charges, discounts, total_rs, created_at)
      VALUES (${schoolId}, ${studentId}, ${month}, ${year}, ${billData.daysPresent},
              ${billData.ratePerDay}, ${billData.extraCharges}, ${billData.discounts}, ${total}, NOW())
      ON CONFLICT (school_id, student_id, month, year) DO UPDATE
        SET days_present = ${billData.daysPresent}, total_rs = ${total}, created_at = NOW()
    `;
  }

  // ── Leave & Outing Management ─────────────────────────────────────────────

  async applyLeave(schoolId: string, leave: {
    studentId: string;
    type: "WEEKEND" | "HOLIDAY" | "MEDICAL" | "EMERGENCY";
    fromDate: Date;
    toDate: Date;
    reason: string;
    parentContactNo: string;
  }): Promise<{ leaveId: string }> {
    const leaveId = `LEAVE-${Date.now()}`;

    await this.prisma.$executeRaw`
      INSERT INTO hostel_leaves (id, school_id, student_id, leave_type, from_date, to_date,
                                  reason, parent_contact, warden_approved, parent_approved, status, applied_at)
      VALUES (${leaveId}, ${schoolId}, ${leave.studentId}, ${leave.type}, ${leave.fromDate},
              ${leave.toDate}, ${leave.reason}, ${leave.parentContactNo}, false, false, 'PENDING', NOW())
    `;

    return { leaveId };
  }

  async approveLeave(leaveId: string, approverId: string, approverType: "WARDEN" | "PARENT"): Promise<void> {
    if (approverType === "WARDEN") {
      await this.prisma.$executeRaw`
        UPDATE hostel_leaves SET warden_approved = true, warden_id = ${approverId},
               warden_approved_at = NOW() WHERE id = ${leaveId}
      `;
    } else {
      await this.prisma.$executeRaw`
        UPDATE hostel_leaves SET parent_approved = true, parent_approved_at = NOW() WHERE id = ${leaveId}
      `;
    }

    // Issue gate pass when both approved
    const leave = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM hostel_leaves WHERE id = ${leaveId}
    `;
    if (leave[0]?.warden_approved && leave[0]?.parent_approved) {
      await this.prisma.$executeRaw`
        UPDATE hostel_leaves SET status = 'APPROVED', gate_pass_issued_at = NOW() WHERE id = ${leaveId}
      `;
    }
  }

  // ── Visitor Log ────────────────────────────────────────────────────────────

  async logHostelVisitor(schoolId: string, visitor: {
    studentId: string;
    visitorName: string;
    relationship: string;
    visitTime: Date;
    purpose: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO hostel_visitors (school_id, student_id, visitor_name, relationship, visit_time, purpose)
      VALUES (${schoolId}, ${visitor.studentId}, ${visitor.visitorName}, ${visitor.relationship},
              ${visitor.visitTime}, ${visitor.purpose})
    `;
  }

  // ── Incident Register ─────────────────────────────────────────────────────

  async logIncident(schoolId: string, incident: {
    wardenId: string;
    involvedStudentIds: string[];
    type: "FIGHT" | "PROPERTY_DAMAGE" | "HEALTH" | "MISSING" | "OTHER";
    description: string;
    actionTaken: string;
    parentNotified: boolean;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO hostel_incidents (school_id, warden_id, involved_students, incident_type,
                                     description, action_taken, parent_notified, logged_at)
      VALUES (${schoolId}, ${incident.wardenId}, ${JSON.stringify(incident.involvedStudentIds)},
              ${incident.type}, ${incident.description}, ${incident.actionTaken},
              ${incident.parentNotified}, NOW())
    `;
  }

  // ── Staff Quarters ────────────────────────────────────────────────────────

  async allotStaffQuarters(schoolId: string, staffId: string, unitId: string, effectiveDate: Date): Promise<void> {
    // Check vacancy
    const occupied = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM staff_quarters_allotments WHERE unit_id = ${unitId} AND status = 'ACTIVE'
    `;
    if (occupied.length > 0) throw new Error("Unit already occupied");

    await this.prisma.$executeRaw`
      INSERT INTO staff_quarters_allotments (school_id, staff_id, unit_id, effective_date, status, created_at)
      VALUES (${schoolId}, ${staffId}, ${unitId}, ${effectiveDate}, 'ACTIVE', NOW())
    `;
  }

  async vacateStaffQuarters(allotmentId: string, vacatingDate: Date): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE staff_quarters_allotments
      SET status = 'VACATED', vacated_on = ${vacatingDate}, updated_at = NOW()
      WHERE id = ${allotmentId}
    `;
  }
}
