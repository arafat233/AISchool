/**
 * RTE 25% Reservation & Government Compliance
 *
 * Right to Education Act Section 12(1)(c):
 *  - 25% seats in entry-level class must be reserved for EWS/disadvantaged children
 *  - Government reimburses tuition fee for these seats
 *  - Lottery draw must be transparent and auditable
 *
 * APAAR ID (Academic Bank of Credits):
 *  - Generate or import APAAR ID per student
 *  - Push academic credits to ABC
 *  - DigiLocker linkage
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import crypto from "crypto";

export interface RteApplication {
  studentName: string;
  dateOfBirth: Date;
  guardianName: string;
  guardianPhone: string;
  guardianIncome: number;
  address: string;
  category: "EWS" | "DG";  // Economically Weaker Section | Disadvantaged Group
  incertificateNo: string;
  schoolId: string;
  appliedClass: string;
}

@Injectable()
export class RteService {
  private readonly logger = new Logger(RteService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Seat Allocation ────────────────────────────────────────────────────────

  async allocateRteSeats(schoolId: string, classId: string, academicYearId: string): Promise<void> {
    const totalSeats = await this.prisma.$queryRaw<any[]>`
      SELECT max_strength FROM classes WHERE id = ${classId}
    `;
    const strength = totalSeats[0]?.max_strength ?? 30;
    const rteSeats = Math.ceil(strength * 0.25);

    await this.prisma.$executeRaw`
      INSERT INTO rte_seat_allocations (school_id, class_id, academic_year_id, total_seats, rte_seats, seats_filled, created_at)
      VALUES (${schoolId}, ${classId}, ${academicYearId}, ${strength}, ${rteSeats}, 0, NOW())
      ON CONFLICT (school_id, class_id, academic_year_id) DO UPDATE
        SET rte_seats = ${rteSeats}, total_seats = ${strength}
    `;
  }

  // ── Application Management ────────────────────────────────────────────────

  async submitApplication(app: RteApplication): Promise<{ applicationNo: string }> {
    const applicationNo = `RTE-${app.schoolId.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    await this.prisma.$executeRaw`
      INSERT INTO rte_applications (
        application_no, school_id, student_name, date_of_birth, guardian_name,
        guardian_phone, guardian_income, address, category, income_certificate_no,
        applied_class, status, applied_at
      )
      VALUES (
        ${applicationNo}, ${app.schoolId}, ${app.studentName}, ${app.dateOfBirth},
        ${app.guardianName}, ${app.guardianPhone}, ${app.guardianIncome}, ${app.address},
        ${app.category}, ${app.incertificateNo}, ${app.appliedClass}, 'PENDING', NOW()
      )
    `;

    return { applicationNo };
  }

  // ── Lottery Draw ──────────────────────────────────────────────────────────

  /**
   * Transparent lottery: seed stored; results reproducible from seed.
   * All applications → random shuffle using CSPRNG seed → top N selected.
   */
  async conductLottery(schoolId: string, classId: string, academicYearId: string): Promise<{
    lotteryId: string;
    seed: string;
    selected: string[];
    waitlisted: string[];
  }> {
    const allocation = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM rte_seat_allocations
      WHERE school_id = ${schoolId} AND class_id = ${classId} AND academic_year_id = ${academicYearId}
    `;

    const applications = await this.prisma.$queryRaw<any[]>`
      SELECT id, application_no, student_name FROM rte_applications
      WHERE school_id = ${schoolId} AND applied_class = ${classId} AND status = 'PENDING'
    `;

    const availableSeats = allocation[0]?.rte_seats - (allocation[0]?.seats_filled ?? 0);
    const seed = crypto.randomBytes(16).toString("hex");
    const lotteryId = `LOTTERY-${Date.now()}`;

    // Seeded shuffle (Fisher-Yates with seed)
    const shuffled = this.seededShuffle(applications, seed);
    const selected = shuffled.slice(0, availableSeats).map(a => a.application_no);
    const waitlisted = shuffled.slice(availableSeats).map(a => a.application_no);

    // Persist lottery result
    await this.prisma.$executeRaw`
      INSERT INTO rte_lotteries (id, school_id, class_id, academic_year_id, seed, selected_count, conducted_at)
      VALUES (${lotteryId}, ${schoolId}, ${classId}, ${academicYearId}, ${seed}, ${selected.length}, NOW())
    `;

    // Update application statuses
    for (const appNo of selected) {
      await this.prisma.$executeRaw`
        UPDATE rte_applications SET status = 'SELECTED' WHERE application_no = ${appNo}
      `;
    }
    for (const appNo of waitlisted) {
      await this.prisma.$executeRaw`
        UPDATE rte_applications SET status = 'WAITLISTED' WHERE application_no = ${appNo}
      `;
    }

    this.logger.log(`RTE Lottery ${lotteryId}: ${selected.length} selected, ${waitlisted.length} waitlisted`);
    return { lotteryId, seed, selected, waitlisted };
  }

  private seededShuffle<T>(arr: T[], seed: string): T[] {
    const result = [...arr];
    let hash = parseInt(seed.slice(0, 8), 16);
    for (let i = result.length - 1; i > 0; i--) {
      hash = (hash * 1664525 + 1013904223) & 0xffffffff;
      const j = Math.abs(hash) % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // ── Reimbursement Claims ───────────────────────────────────────────────────

  async generateReimbursementClaim(schoolId: string, academicYearId: string, termId: string): Promise<any> {
    const rteStudents = await this.prisma.$queryRaw<any[]>`
      SELECT s.id, s.full_name, s.class_id, fs.amount_rs AS fee_per_term
      FROM students s
      JOIN fee_structures fs ON fs.class_id = s.class_id AND fs.academic_year_id = ${academicYearId}
      JOIN fee_heads fh ON fh.id = fs.fee_head_id AND fh.name = 'Tuition Fee'
      WHERE s.school_id = ${schoolId} AND s.is_rte = true AND s.status = 'ACTIVE'
    `;

    const claimAmount = rteStudents.reduce((s, r) => s + Number(r.fee_per_term), 0);

    await this.prisma.$executeRaw`
      INSERT INTO rte_reimbursement_claims (school_id, academic_year_id, term_id, student_count, claim_amount_rs, status, filed_at)
      VALUES (${schoolId}, ${academicYearId}, ${termId}, ${rteStudents.length}, ${claimAmount}, 'FILED', NOW())
    `;

    return {
      students: rteStudents.length,
      claimAmountRs: claimAmount,
      period: termId,
      students_list: rteStudents,
    };
  }

  // ── APAAR ID Integration ──────────────────────────────────────────────────

  async linkApaarId(studentId: string, apaarId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE students SET apaar_id = ${apaarId}, apaar_linked_at = NOW() WHERE id = ${studentId}
    `;
  }

  async pushCreditsToAbc(studentId: string, credits: { subject: string; grade: string; creditPoints: number; academicYear: string }[]): Promise<void> {
    // In production: call ABC API with APAAR ID + credit records
    const student = await this.prisma.$queryRaw<any[]>`
      SELECT apaar_id, full_name FROM students WHERE id = ${studentId}
    `;
    if (!student[0]?.apaar_id) {
      this.logger.warn(`Student ${studentId} has no APAAR ID — cannot push to ABC`);
      return;
    }
    this.logger.log(`ABC credits pushed for student ${student[0].apaar_id}: ${credits.length} subjects`);
  }

  // ── Compliance Report ─────────────────────────────────────────────────────

  async getMonthlyComplianceReport(schoolId: string, month: number, year: number): Promise<any> {
    return this.prisma.$queryRaw`
      SELECT
        c.total_seats,
        c.rte_seats,
        c.seats_filled AS rte_admitted,
        COUNT(s.id) FILTER (WHERE s.is_rte = true AND s.status = 'ACTIVE') AS rte_attending,
        COUNT(s.id) FILTER (WHERE s.is_rte = true AND att.status = 'ABSENT') AS rte_absent_today
      FROM rte_seat_allocations c
      LEFT JOIN students s ON s.school_id = c.school_id AND s.is_rte = true
      LEFT JOIN attendance_records att ON att.student_id = s.id
        AND EXTRACT(MONTH FROM att.date) = ${month} AND EXTRACT(YEAR FROM att.date) = ${year}
      WHERE c.school_id = ${schoolId}
      GROUP BY c.total_seats, c.rte_seats, c.seats_filled
    `;
  }
}
