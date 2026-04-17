import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";
import type { DifficultyLevel, BloomLevel } from "./question-bank.service";

export interface AutoPickConfig {
  subjectId: string;
  gradeLevelId?: string;
  totalQuestions: number;
  difficultyRatio?: { EASY: number; MEDIUM: number; HARD: number };  // percentages, must sum to 100
  bloomLevels?: BloomLevel[];
  topics?: string[];
}

@Injectable()
export class TestBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Online Test CRUD ───────────────────────────────────────────────────────

  async createOnlineTest(schoolId: string, data: {
    title: string;
    description?: string;
    examId?: string;       // optional link to a traditional exam
    sectionId?: string;
    gradeLevelId?: string;
    subjectId?: string;
    durationMinutes: number;
    startAt?: string;
    endAt?: string;
    maxAttempts?: number;
    passScore?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showResultImmediately?: boolean;
    allowReview?: boolean;
    negativeMarkingEnabled?: boolean;
  }) {
    return this.prisma.onlineTest.create({
      data: {
        schoolId,
        title: data.title,
        description: data.description,
        examId: data.examId,
        sectionId: data.sectionId,
        gradeLevelId: data.gradeLevelId,
        subjectId: data.subjectId,
        durationMinutes: data.durationMinutes,
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
        maxAttempts: data.maxAttempts ?? 1,
        passScore: data.passScore ?? 40,
        shuffleQuestions: data.shuffleQuestions ?? true,
        shuffleOptions: data.shuffleOptions ?? true,
        showResultImmediately: data.showResultImmediately ?? true,
        allowReview: data.allowReview ?? false,
        negativeMarkingEnabled: data.negativeMarkingEnabled ?? false,
        status: "DRAFT",
      },
    });
  }

  async getOnlineTests(schoolId: string, filters?: { sectionId?: string; subjectId?: string; status?: string }) {
    return this.prisma.onlineTest.findMany({
      where: {
        schoolId,
        ...(filters?.sectionId ? { sectionId: filters.sectionId } : {}),
        ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        _count: { select: { testQuestions: true } },
        subject: true,
        section: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOnlineTest(id: string) {
    const test = await this.prisma.onlineTest.findUnique({
      where: { id },
      include: {
        testQuestions: {
          include: { question: true },
          orderBy: { orderIndex: "asc" },
        },
        subject: true,
        section: true,
      },
    });
    if (!test) throw new NotFoundError("Online test not found");
    return test;
  }

  // ─── Manual Question Selection ───────────────────────────────────────────────

  async addQuestionsToTest(testId: string, questionIds: string[]) {
    const test = await this.prisma.onlineTest.findUnique({ where: { id: testId } });
    if (!test) throw new NotFoundError("Online test not found");
    if (test.status !== "DRAFT") throw new BadRequestException("Can only modify questions on DRAFT tests");

    // Get current max order index
    const lastEntry = await this.prisma.testQuestion.findFirst({
      where: { testId },
      orderBy: { orderIndex: "desc" },
    });
    let nextIndex = (lastEntry?.orderIndex ?? 0) + 1;

    const ops = questionIds.map((questionId) =>
      this.prisma.testQuestion.upsert({
        where: { testId_questionId: { testId, questionId } },
        update: {},
        create: { testId, questionId, orderIndex: nextIndex++ },
      }),
    );

    return this.prisma.$transaction(ops);
  }

  async removeQuestionFromTest(testId: string, questionId: string) {
    return this.prisma.testQuestion.delete({
      where: { testId_questionId: { testId, questionId } },
    });
  }

  // ─── Auto-Pick Questions ────────────────────────────────────────────────────

  async autoPickQuestions(testId: string, config: AutoPickConfig) {
    const test = await this.prisma.onlineTest.findUnique({ where: { id: testId } });
    if (!test) throw new NotFoundError("Online test not found");
    if (test.status !== "DRAFT") throw new BadRequestException("Can only modify questions on DRAFT tests");

    const ratio = config.difficultyRatio ?? { EASY: 30, MEDIUM: 50, HARD: 20 };
    const total = ratio.EASY + ratio.MEDIUM + ratio.HARD;
    if (total !== 100) throw new BadRequestException("Difficulty ratio must sum to 100");

    const easyCount = Math.round((ratio.EASY / 100) * config.totalQuestions);
    const hardCount = Math.round((ratio.HARD / 100) * config.totalQuestions);
    const mediumCount = config.totalQuestions - easyCount - hardCount;

    const difficultyMap: [DifficultyLevel, number][] = [
      ["EASY", easyCount],
      ["MEDIUM", mediumCount],
      ["HARD", hardCount],
    ];

    const pickedIds: string[] = [];

    for (const [difficulty, count] of difficultyMap) {
      if (count <= 0) continue;
      const where: any = {
        schoolId: test.schoolId,
        subjectId: config.subjectId,
        difficulty,
        ...(config.gradeLevelId ? { gradeLevelId: config.gradeLevelId } : {}),
        ...(config.bloomLevels?.length ? { bloomLevel: { in: config.bloomLevels } } : {}),
        ...(config.topics?.length ? { topic: { in: config.topics } } : {}),
        // Exclude already-added questions
        id: { notIn: pickedIds },
      };

      const candidates = await this.prisma.question.findMany({ where, select: { id: true } });
      // Random sample
      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      pickedIds.push(...shuffled.slice(0, count).map((q) => q.id));
    }

    if (pickedIds.length < config.totalQuestions) {
      throw new BadRequestException(
        `Not enough questions available. Requested ${config.totalQuestions}, found ${pickedIds.length}.`,
      );
    }

    return this.addQuestionsToTest(testId, pickedIds);
  }

  // ─── Publish / Unpublish Test ────────────────────────────────────────────────

  async publishTest(testId: string) {
    const test = await this.getOnlineTest(testId);
    if (test.testQuestions.length === 0) {
      throw new BadRequestException("Cannot publish a test with no questions");
    }
    return this.prisma.onlineTest.update({ where: { id: testId }, data: { status: "PUBLISHED" } });
  }

  async unpublishTest(testId: string) {
    return this.prisma.onlineTest.update({ where: { id: testId }, data: { status: "DRAFT" } });
  }

  // ─── Bloom's Distribution Report ─────────────────────────────────────────────

  async getBloomsReport(testId: string) {
    const test = await this.getOnlineTest(testId);
    const questions = test.testQuestions.map((tq: any) => tq.question);

    const dist: Record<string, number> = {
      REMEMBER: 0, UNDERSTAND: 0, APPLY: 0, ANALYZE: 0, EVALUATE: 0, CREATE: 0, UNTAGGED: 0,
    };
    for (const q of questions) {
      const key = (q as any).bloomLevel ?? "UNTAGGED";
      dist[key] = (dist[key] ?? 0) + 1;
    }

    const total = questions.length;
    const distribution = Object.entries(dist).map(([level, count]) => ({
      level,
      count,
      percentage: total > 0 ? +((count / total) * 100).toFixed(1) : 0,
    }));

    return { testId, title: test.title, totalQuestions: total, distribution };
  }
}
