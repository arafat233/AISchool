/**
 * Gamification & Engagement Engine
 *
 * Points, badges (Bronze/Silver/Gold), streaks, leaderboards,
 * rewards (redemption), digital portfolio, digital ID card,
 * house points, student council integration.
 * Anti-gaming: no repeat points for same action in 24h.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { createClient, RedisClientType } from "redis";

export type PointAction =
  | "ATTENDANCE_PRESENT"
  | "ASSIGNMENT_SUBMITTED"
  | "QUIZ_COMPLETED"
  | "BOOK_READ"          // library issue + return
  | "COMMUNITY_SERVICE"
  | "LMS_LESSON_COMPLETED"
  | "HOMEWORK_SUBMITTED"
  | "SPORTS_PARTICIPATION"
  | "CULTURAL_PARTICIPATION";

export type BadgeCategory = "ACADEMIC" | "SPORTS" | "CULTURAL" | "SERVICE" | "ATTENDANCE";
export type BadgeTier = "BRONZE" | "SILVER" | "GOLD";

export interface BadgeRule {
  category: BadgeCategory;
  tier: BadgeTier;
  requiredPoints: number;
  name: string;
  icon: string;
}

const BADGE_RULES: BadgeRule[] = [
  { category: "ACADEMIC",    tier: "BRONZE", requiredPoints: 100,  name: "Scholar",          icon: "📚" },
  { category: "ACADEMIC",    tier: "SILVER", requiredPoints: 300,  name: "Distinction",      icon: "🎓" },
  { category: "ACADEMIC",    tier: "GOLD",   requiredPoints: 750,  name: "Excellence Award", icon: "🏆" },
  { category: "ATTENDANCE",  tier: "BRONZE", requiredPoints: 50,   name: "Punctual",         icon: "⏰" },
  { category: "ATTENDANCE",  tier: "SILVER", requiredPoints: 150,  name: "Consistent",       icon: "🌟" },
  { category: "ATTENDANCE",  tier: "GOLD",   requiredPoints: 400,  name: "Perfect Attendance",icon: "🥇" },
  { category: "SPORTS",      tier: "BRONZE", requiredPoints: 80,   name: "Active",           icon: "⚽" },
  { category: "SPORTS",      tier: "SILVER", requiredPoints: 200,  name: "Athlete",          icon: "🏅" },
  { category: "SPORTS",      tier: "GOLD",   requiredPoints: 500,  name: "Champion",         icon: "🏆" },
  { category: "CULTURAL",    tier: "BRONZE", requiredPoints: 60,   name: "Performer",        icon: "🎭" },
  { category: "CULTURAL",    tier: "SILVER", requiredPoints: 180,  name: "Artist",           icon: "🎨" },
  { category: "CULTURAL",    tier: "GOLD",   requiredPoints: 450,  name: "Star Performer",   icon: "⭐" },
  { category: "SERVICE",     tier: "BRONZE", requiredPoints: 40,   name: "Helper",           icon: "🤝" },
  { category: "SERVICE",     tier: "SILVER", requiredPoints: 120,  name: "Volunteer",        icon: "💚" },
  { category: "SERVICE",     tier: "GOLD",   requiredPoints: 300,  name: "Community Hero",   icon: "🦸" },
];

const ACTION_TO_CATEGORY: Record<PointAction, BadgeCategory> = {
  ATTENDANCE_PRESENT:    "ATTENDANCE",
  ASSIGNMENT_SUBMITTED:  "ACADEMIC",
  QUIZ_COMPLETED:        "ACADEMIC",
  BOOK_READ:             "ACADEMIC",
  COMMUNITY_SERVICE:     "SERVICE",
  LMS_LESSON_COMPLETED:  "ACADEMIC",
  HOMEWORK_SUBMITTED:    "ACADEMIC",
  SPORTS_PARTICIPATION:  "SPORTS",
  CULTURAL_PARTICIPATION:"CULTURAL",
};

@Injectable()
export class GamificationService implements OnModuleInit {
  private readonly logger = new Logger(GamificationService.name);
  private redis!: RedisClientType;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.redis = createClient({ url: process.env.REDIS_URL ?? "redis://redis:6379" }) as RedisClientType;
    this.redis.on("error", err => this.logger.error("Redis error", err));
    await this.redis.connect();
  }

  // ── Points ────────────────────────────────────────────────────────────────

  async awardPoints(schoolId: string, studentId: string, action: PointAction, points: number, referenceId?: string): Promise<{ awarded: boolean; totalPoints: number }> {
    // Anti-gaming: check if same action was awarded in last 24h
    const dedupeKey = `gamification:${studentId}:${action}:${new Date().toISOString().slice(0, 10)}`;
    const alreadyAwarded = await this.redis.get(dedupeKey);
    if (alreadyAwarded) return { awarded: false, totalPoints: await this.getTotalPoints(studentId) };

    const category = ACTION_TO_CATEGORY[action];

    await this.prisma.$executeRaw`
      INSERT INTO gamification_points (school_id, student_id, action, category, points, reference_id, awarded_at)
      VALUES (${schoolId}, ${studentId}, ${action}, ${category}, ${points}, ${referenceId ?? null}, NOW())
    `;

    // Set dedupe TTL = rest of today + buffer
    await this.redis.setEx(dedupeKey, 86400, "1");

    // Update streak
    await this.updateStreak(studentId, action);

    const totalPoints = await this.getTotalPoints(studentId);

    // Check badge eligibility
    await this.checkAndAwardBadges(schoolId, studentId, category, totalPoints);

    return { awarded: true, totalPoints };
  }

  async getTotalPoints(studentId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(points), 0) AS total FROM gamification_points WHERE student_id = ${studentId}
    `;
    return Number(rows[0]?.total ?? 0);
  }

  async getPointsByCategory(studentId: string): Promise<Record<BadgeCategory, number>> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT category, SUM(points) AS total FROM gamification_points
      WHERE student_id = ${studentId} GROUP BY category
    `;
    const result: any = {};
    for (const r of rows) result[r.category] = Number(r.total);
    return result;
  }

  // ── Badges ────────────────────────────────────────────────────────────────

  private async checkAndAwardBadges(schoolId: string, studentId: string, category: BadgeCategory, totalCategoryPoints: number): Promise<void> {
    const categoryPoints = await this.prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(points), 0) AS total FROM gamification_points
      WHERE student_id = ${studentId} AND category = ${category}
    `;
    const pts = Number(categoryPoints[0]?.total ?? 0);

    const rules = BADGE_RULES.filter(r => r.category === category && r.requiredPoints <= pts);
    for (const rule of rules) {
      await this.prisma.$executeRaw`
        INSERT INTO student_badges (school_id, student_id, category, tier, name, icon, awarded_at)
        VALUES (${schoolId}, ${studentId}, ${rule.category}, ${rule.tier}, ${rule.name}, ${rule.icon}, NOW())
        ON CONFLICT (student_id, category, tier) DO NOTHING
      `;
    }
  }

  async getBadges(studentId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT * FROM student_badges WHERE student_id = ${studentId} ORDER BY awarded_at DESC
    `;
  }

  // ── Streaks ────────────────────────────────────────────────────────────────

  private async updateStreak(studentId: string, action: PointAction): Promise<void> {
    const streakKey = `streak:${studentId}:${action}`;
    const today = new Date().toISOString().slice(0, 10);

    const lastDay = await this.redis.hGet(streakKey, "lastDay");
    const count = parseInt(await this.redis.hGet(streakKey, "count") ?? "0", 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const newCount = lastDay === yesterday ? count + 1 : lastDay === today ? count : 1;
    await this.redis.hSet(streakKey, { lastDay: today, count: String(newCount) });

    // Streak bonuses: 7 / 30 / 100 days
    const bonuses: Record<number, number> = { 7: 50, 30: 200, 100: 500 };
    if (bonuses[newCount]) {
      await this.prisma.$executeRaw`
        INSERT INTO gamification_points (student_id, action, category, points, awarded_at)
        VALUES (${studentId}, ${"STREAK_BONUS"}, ${ACTION_TO_CATEGORY[action]}, ${bonuses[newCount]}, NOW())
      `;
    }
  }

  async getStreak(studentId: string, action: PointAction): Promise<number> {
    const count = await this.redis.hGet(`streak:${studentId}:${action}`, "count");
    return parseInt(count ?? "0", 10);
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────

  async getClassLeaderboard(classId: string, schoolId: string, limit = 10): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT s.id, s.full_name, s.house,
             COALESCE(SUM(gp.points), 0) AS total_points,
             RANK() OVER (ORDER BY COALESCE(SUM(gp.points), 0) DESC) AS rank
      FROM students s
      LEFT JOIN gamification_points gp ON gp.student_id = s.id
      WHERE s.class_id = ${classId} AND s.school_id = ${schoolId}
        AND s.gamification_opt_out = false
      GROUP BY s.id, s.full_name, s.house
      ORDER BY total_points DESC
      LIMIT ${limit}
    `;
  }

  async getHouseLeaderboard(schoolId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT s.house, COALESCE(SUM(gp.points), 0) AS total_points
      FROM students s
      LEFT JOIN gamification_points gp ON gp.student_id = s.id
      WHERE s.school_id = ${schoolId} AND s.house IS NOT NULL
      GROUP BY s.house
      ORDER BY total_points DESC
    `;
  }

  // ── Rewards Redemption ────────────────────────────────────────────────────

  async redeemReward(schoolId: string, studentId: string, rewardId: string): Promise<{ success: boolean; message: string }> {
    const [reward, balance] = await Promise.all([
      this.prisma.$queryRaw<any[]>`SELECT * FROM gamification_rewards WHERE id = ${rewardId} AND school_id = ${schoolId}`,
      this.getTotalPoints(studentId),
    ]);

    if (!reward[0]) return { success: false, message: "Reward not found" };
    if (balance < reward[0].points_cost) return { success: false, message: `Need ${reward[0].points_cost} points, you have ${balance}` };

    await this.prisma.$executeRaw`
      INSERT INTO reward_redemptions (school_id, student_id, reward_id, points_spent, redeemed_at)
      VALUES (${schoolId}, ${studentId}, ${rewardId}, ${reward[0].points_cost}, NOW())
    `;
    // Deduct points
    await this.prisma.$executeRaw`
      INSERT INTO gamification_points (school_id, student_id, action, category, points, awarded_at)
      VALUES (${schoolId}, ${studentId}, 'REWARD_REDEMPTION', 'ACADEMIC', ${-reward[0].points_cost}, NOW())
    `;

    return { success: true, message: `Reward "${reward[0].name}" redeemed successfully!` };
  }

  // ── Digital Portfolio ─────────────────────────────────────────────────────

  async addPortfolioItem(studentId: string, item: {
    title: string;
    description: string;
    category: "ACADEMIC" | "SPORTS" | "CULTURAL" | "COMMUNITY" | "ACHIEVEMENT";
    fileUrl?: string;
    termId: string;
    teacherEndorsement?: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO student_portfolio (student_id, title, description, category, file_url, term_id,
                                      teacher_endorsement, created_at)
      VALUES (${studentId}, ${item.title}, ${item.description}, ${item.category},
              ${item.fileUrl ?? null}, ${item.termId}, ${item.teacherEndorsement ?? null}, NOW())
    `;
  }

  async getPortfolio(studentId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT p.*, t.name AS term_name, ay.label AS academic_year
      FROM student_portfolio p
      JOIN terms t ON t.id = p.term_id
      JOIN academic_years ay ON ay.id = t.academic_year_id
      WHERE p.student_id = ${studentId}
      ORDER BY p.created_at DESC
    `;
  }

  // ── Digital ID Card ────────────────────────────────────────────────────────

  async generateDigitalId(studentId: string): Promise<{ qrData: string; idCardUrl: string }> {
    const student = await this.prisma.$queryRaw<any[]>`
      SELECT s.*, sc.name AS school_name, sc.logo_url, cl.name AS class_name
      FROM students s
      JOIN schools sc ON sc.id = s.school_id
      JOIN classes cl ON cl.id = s.class_id
      WHERE s.id = ${studentId}
    `;

    if (!student[0]) throw new Error("Student not found");

    const qrData = JSON.stringify({
      studentId,
      admissionNo: student[0].admission_no,
      name: student[0].full_name,
      class: student[0].class_name,
      school: student[0].school_name,
      validUntil: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    });

    // In production: generate PDF with QR code using pdfkit + qrcode library
    const idCardUrl = `digital_id_${studentId}_${Date.now()}.pdf`;

    await this.prisma.$executeRaw`
      UPDATE students SET digital_id_qr = ${qrData}, digital_id_generated_at = NOW() WHERE id = ${studentId}
    `;

    return { qrData, idCardUrl };
  }
}

// Import for OnModuleInit
import { OnModuleInit } from "@nestjs/common";
