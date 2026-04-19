/**
 * Pre-Primary / Play School Module
 *
 * Daily activity log, developmental milestone tracking,
 * parent daily report, photo diary, allergen tracking,
 * pickup authorisation, potty training log, nap schedule.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import axios from "axios";

export interface DailyActivityLog {
  studentId: string;
  schoolId: string;
  teacherId: string;
  date: Date;
  arrivalTime?: string;
  departureTime?: string;
  meals: { meal: "BREAKFAST" | "SNACK_AM" | "LUNCH" | "SNACK_PM"; ate: "ALL" | "MOST" | "SOME" | "NONE" }[];
  napStart?: string;
  napEnd?: string;
  mood: "HAPPY" | "CONTENT" | "UNSETTLED" | "UPSET";
  activities: string[];       // e.g. ["Painting", "Story Time", "Sand Play"]
  toileting: { time: string; type: "WET" | "DRY" | "SOILED" }[];
  notes?: string;
  incidents?: string;
}

export interface Milestone {
  domain: "GROSS_MOTOR" | "FINE_MOTOR" | "LANGUAGE" | "COGNITIVE" | "SOCIAL_EMOTIONAL" | "SELF_CARE";
  milestone: string;
  ageMonthsExpected: number;
  achievedAt?: Date;
  status: "NOT_YET" | "EMERGING" | "ACHIEVED";
  notes?: string;
}

@Injectable()
export class PrePrimaryService {
  private readonly logger = new Logger(PrePrimaryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Daily Activity Log ────────────────────────────────────────────────────

  async recordDailyActivity(log: DailyActivityLog): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO pre_primary_daily_logs (
        student_id, school_id, teacher_id, date, arrival_time, departure_time,
        meals, nap_start, nap_end, mood, activities, toileting, notes, incidents, created_at
      )
      VALUES (
        ${log.studentId}, ${log.schoolId}, ${log.teacherId}, ${log.date},
        ${log.arrivalTime ?? null}, ${log.departureTime ?? null},
        ${JSON.stringify(log.meals)}, ${log.napStart ?? null}, ${log.napEnd ?? null},
        ${log.mood}, ${JSON.stringify(log.activities)}, ${JSON.stringify(log.toileting)},
        ${log.notes ?? null}, ${log.incidents ?? null}, NOW()
      )
      ON CONFLICT (student_id, date) DO UPDATE
        SET meals = ${JSON.stringify(log.meals)},
            mood = ${log.mood},
            activities = ${JSON.stringify(log.activities)},
            notes = ${log.notes ?? null}
    `;
  }

  /** Send parent daily report at end of day via notification-service */
  async sendParentDailyReport(schoolId: string, date: Date): Promise<void> {
    const logs = await this.prisma.$queryRaw<any[]>`
      SELECT l.*, s.full_name AS student_name, p.user_id AS parent_user_id, p.whatsapp_number
      FROM pre_primary_daily_logs l
      JOIN students s ON s.id = l.student_id
      JOIN student_parents p ON p.student_id = s.id AND p.is_primary = true
      WHERE l.school_id = ${schoolId} AND l.date = ${date}
    `;

    for (const log of logs) {
      const mealSummary = log.meals?.map((m: any) => `${m.meal}: ${m.ate}`).join(", ");
      const napDuration = log.nap_start && log.nap_end
        ? `${log.nap_start}–${log.nap_end}`
        : "No nap recorded";

      const message = `Today's report for ${log.student_name}:\n`
        + `😊 Mood: ${log.mood}\n`
        + `🍽️ Meals: ${mealSummary}\n`
        + `😴 Nap: ${napDuration}\n`
        + `🎨 Activities: ${log.activities?.join(", ")}\n`
        + (log.notes ? `📝 Notes: ${log.notes}` : "");

      try {
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL ?? "http://notification-service:3007"}/internal/push`, {
          userId: log.parent_user_id,
          title: `${log.student_name}'s Day at School`,
          body: message,
          data: { type: "DAILY_REPORT", studentId: log.student_id, date: date.toISOString() },
        });
      } catch { /* non-critical */ }
    }
    this.logger.log(`Parent daily reports sent for ${logs.length} children on ${date.toDateString()}`);
  }

  // ── Milestone Tracking ────────────────────────────────────────────────────

  async getMilestones(studentId: string): Promise<any[]> {
    const student = await this.prisma.$queryRaw<any[]>`
      SELECT date_of_birth FROM students WHERE id = ${studentId}
    `;
    const ageMonths = student[0]?.date_of_birth
      ? Math.floor((Date.now() - new Date(student[0].date_of_birth).getTime()) / (30 * 86400000))
      : 0;

    const achieved = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM student_milestones WHERE student_id = ${studentId}
    `;

    return achieved.map(m => ({
      ...m,
      ageAtAchievement: m.achieved_at
        ? Math.floor((new Date(m.achieved_at).getTime() - new Date(student[0]?.date_of_birth).getTime()) / (30 * 86400000))
        : null,
    }));
  }

  async updateMilestone(studentId: string, teacherId: string, milestone: {
    domain: string;
    milestone: string;
    status: "NOT_YET" | "EMERGING" | "ACHIEVED";
    notes?: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO student_milestones (student_id, teacher_id, domain, milestone, status, notes, achieved_at, updated_at)
      VALUES (${studentId}, ${teacherId}, ${milestone.domain}, ${milestone.milestone},
              ${milestone.status}, ${milestone.notes ?? null},
              ${milestone.status === "ACHIEVED" ? new Date() : null}, NOW())
      ON CONFLICT (student_id, domain, milestone) DO UPDATE
        SET status = ${milestone.status}, notes = ${milestone.notes ?? null},
            achieved_at = CASE WHEN ${milestone.status} = 'ACHIEVED' AND achieved_at IS NULL THEN NOW() ELSE achieved_at END,
            updated_at = NOW()
    `;
  }

  // ── Photo Diary ────────────────────────────────────────────────────────────

  async uploadPhoto(schoolId: string, studentId: string, teacherId: string, photoData: {
    s3Key: string;
    caption: string;
    date: Date;
    parentConsentVerified: boolean;
  }): Promise<void> {
    if (!photoData.parentConsentVerified) {
      throw new Error("Parent consent required before uploading child photos");
    }
    await this.prisma.$executeRaw`
      INSERT INTO pre_primary_photos (school_id, student_id, teacher_id, s3_key, caption, date, parent_consent_verified, created_at)
      VALUES (${schoolId}, ${studentId}, ${teacherId}, ${photoData.s3Key}, ${photoData.caption},
              ${photoData.date}, true, NOW())
    `;
  }

  async getPhotoGallery(studentId: string, parentUserId: string): Promise<any[]> {
    // Only the student's own photos — never shared across students
    return this.prisma.$queryRaw`
      SELECT p.*, '' AS signed_url  -- in production: generate S3 pre-signed URL
      FROM pre_primary_photos p
      JOIN students s ON s.id = p.student_id
      JOIN student_parents sp ON sp.student_id = s.id AND sp.user_id = ${parentUserId}
      WHERE p.student_id = ${studentId}
      ORDER BY p.date DESC
      LIMIT 90
    `;
  }

  // ── Pickup Authorisation ──────────────────────────────────────────────────

  async addAuthorisedPickup(studentId: string, person: {
    name: string;
    relationship: string;
    phone: string;
    photoUrl: string;
    idType: string;
    idNumber: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO authorised_pickups (student_id, name, relationship, phone, photo_url, id_type, id_number, active, created_at)
      VALUES (${studentId}, ${person.name}, ${person.relationship}, ${person.phone},
              ${person.photoUrl}, ${person.idType}, ${person.idNumber}, true, NOW())
    `;
  }

  async verifyPickup(studentId: string, personPhone: string): Promise<{ authorised: boolean; person?: any }> {
    const person = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM authorised_pickups WHERE student_id = ${studentId} AND phone = ${personPhone} AND active = true
    `;
    return { authorised: person.length > 0, person: person[0] };
  }

  // ── Allergen Management ────────────────────────────────────────────────────

  async setAllergenProfile(studentId: string, allergens: string[], dietaryNeeds: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE students SET allergens = ${JSON.stringify(allergens)}, dietary_needs = ${dietaryNeeds}
      WHERE id = ${studentId}
    `;
  }

  async checkMealCompatibility(studentId: string, mealMenuItemId: string): Promise<{ safe: boolean; conflictingAllergens: string[] }> {
    const student = await this.prisma.$queryRaw<any[]>`SELECT allergens FROM students WHERE id = ${studentId}`;
    const menuItem = await this.prisma.$queryRaw<any[]>`SELECT allergens FROM menu_items WHERE id = ${mealMenuItemId}`;

    const studentAllergens: string[] = student[0]?.allergens ?? [];
    const itemAllergens: string[] = menuItem[0]?.allergens ?? [];
    const conflicts = studentAllergens.filter(a => itemAllergens.includes(a));

    return { safe: conflicts.length === 0, conflictingAllergens: conflicts };
  }

  // ── Nap Schedule ──────────────────────────────────────────────────────────

  async setNapSchedule(studentId: string, schedule: {
    preferredStart: string;  // "12:30"
    preferredDuration: number;  // minutes
    notes: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO nap_schedules (student_id, preferred_start, preferred_duration_mins, notes, updated_at)
      VALUES (${studentId}, ${schedule.preferredStart}, ${schedule.preferredDuration}, ${schedule.notes}, NOW())
      ON CONFLICT (student_id) DO UPDATE
        SET preferred_start = ${schedule.preferredStart},
            preferred_duration_mins = ${schedule.preferredDuration},
            notes = ${schedule.notes}, updated_at = NOW()
    `;
  }
}
