import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuestionAnswer {
  questionId: string;
  selectedOptionIds?: string[];    // MCQ_SINGLE / MCQ_MULTI / TRUE_FALSE / IMAGE_MCQ
  textAnswer?: string;             // FILL_BLANK / SHORT_ANSWER / LONG_ANSWER
  matchAnswers?: { left: string; right: string }[];  // MATCH
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class TestDeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Start Attempt ──────────────────────────────────────────────────────────

  async startAttempt(testId: string, studentId: string) {
    const test = await this.prisma.onlineTest.findUnique({
      where: { id: testId },
      include: {
        testQuestions: {
          include: { question: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });
    if (!test) throw new NotFoundError("Online test not found");
    if (test.status !== "PUBLISHED") throw new BadRequestException("Test is not available");

    const now = new Date();
    if (test.startAt && now < test.startAt) throw new BadRequestException("Test has not started yet");
    if (test.endAt && now > test.endAt) throw new BadRequestException("Test window has closed");

    // Check attempt count
    const previousAttempts = await this.prisma.testAttempt.count({
      where: { testId, studentId, status: { in: ["COMPLETED", "SUBMITTED", "AUTO_SUBMITTED"] } },
    });
    if (previousAttempts >= (test.maxAttempts ?? 1)) {
      throw new ForbiddenException(`Maximum ${test.maxAttempts} attempt(s) reached`);
    }

    // Check for in-progress attempt
    const inProgress = await this.prisma.testAttempt.findFirst({
      where: { testId, studentId, status: "IN_PROGRESS" },
    });
    if (inProgress) {
      // Resume existing attempt; return current state
      return this.getAttemptState(inProgress.id, test);
    }

    // Randomise question order if configured
    let questions = test.testQuestions.map((tq: any) => tq.question);
    if (test.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    // Randomise options per question if configured
    const questionOrder = questions.map((q: any) => {
      if (test.shuffleOptions && Array.isArray(q.options)) {
        return { ...q, options: [...q.options].sort(() => Math.random() - 0.5) };
      }
      return q;
    });

    const expiresAt = new Date(now.getTime() + test.durationMinutes * 60 * 1000);

    const attempt = await this.prisma.testAttempt.create({
      data: {
        testId,
        studentId,
        status: "IN_PROGRESS",
        startedAt: now,
        expiresAt,
        questionOrder: questionOrder.map((q: any) => q.id),
        tabSwitchCount: 0,
      },
    });

    return {
      attemptId: attempt.id,
      testTitle: test.title,
      durationMinutes: test.durationMinutes,
      expiresAt,
      questions: questionOrder.map((q: any) => this.sanitizeQuestionForDelivery(q)),
      totalQuestions: questionOrder.length,
    };
  }

  // ─── Save Answer (auto-save on each answer) ─────────────────────────────────

  async saveAnswer(attemptId: string, answer: QuestionAnswer) {
    await this.validateAttemptInProgress(attemptId);

    await this.prisma.testAttemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: answer.questionId } },
      update: {
        selectedOptionIds: answer.selectedOptionIds ?? [],
        textAnswer: answer.textAnswer,
        matchAnswers: answer.matchAnswers as any,
        answeredAt: new Date(),
      },
      create: {
        attemptId,
        questionId: answer.questionId,
        selectedOptionIds: answer.selectedOptionIds ?? [],
        textAnswer: answer.textAnswer,
        matchAnswers: answer.matchAnswers as any,
        answeredAt: new Date(),
      },
    });

    return { saved: true };
  }

  // ─── Record Tab Switch (anti-cheating) ──────────────────────────────────────

  async recordTabSwitch(attemptId: string): Promise<{ warning: boolean; autoSubmitted: boolean; tabSwitchCount: number }> {
    const attempt = await this.validateAttemptInProgress(attemptId);
    const newCount = (attempt.tabSwitchCount ?? 0) + 1;

    await this.prisma.testAttempt.update({
      where: { id: attemptId },
      data: { tabSwitchCount: newCount },
    });

    if (newCount >= 2) {
      // Auto-submit on 2nd tab switch
      await this.submitAttempt(attemptId, "auto");
      return { warning: false, autoSubmitted: true, tabSwitchCount: newCount };
    }

    return { warning: true, autoSubmitted: false, tabSwitchCount: newCount };
  }

  // ─── Submit Attempt ─────────────────────────────────────────────────────────

  async submitAttempt(attemptId: string, reason: "manual" | "auto" | "timeout" = "manual") {
    const attempt = await this.validateAttemptInProgress(attemptId);

    const status = reason === "manual" ? "SUBMITTED" : reason === "auto" ? "AUTO_SUBMITTED" : "TIMEOUT";

    // Grade all answers
    const gradingResult = await this.gradeAttempt(attemptId);

    await this.prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        status,
        submittedAt: new Date(),
        totalMarks: gradingResult.totalMarks,
        marksObtained: gradingResult.marksObtained,
        percentageScore: gradingResult.percentageScore,
        isPassed: gradingResult.isPassed,
      },
    });

    const test = await this.prisma.onlineTest.findUnique({ where: { id: attempt.testId } });

    return {
      attemptId,
      status,
      marksObtained: gradingResult.marksObtained,
      totalMarks: gradingResult.totalMarks,
      percentageScore: gradingResult.percentageScore,
      isPassed: gradingResult.isPassed,
      showResult: test?.showResultImmediately ?? true,
      questionResults: test?.showResultImmediately ? gradingResult.questionResults : undefined,
    };
  }

  // ─── Check and Auto-Submit Expired Attempts ─────────────────────────────────

  async expireTimedOutAttempts(): Promise<number> {
    const expired = await this.prisma.testAttempt.findMany({
      where: { status: "IN_PROGRESS", expiresAt: { lt: new Date() } },
    });

    for (const attempt of expired) {
      await this.submitAttempt(attempt.id, "timeout");
    }

    return expired.length;
  }

  // ─── Teacher Review Queue (subjective answers) ──────────────────────────────

  async getSubjectiveReviewQueue(testId: string) {
    return this.prisma.testAttemptAnswer.findMany({
      where: {
        attempt: { testId },
        question: { type: { in: ["SHORT_ANSWER", "LONG_ANSWER"] } },
        manualScore: null,
      },
      include: {
        question: true,
        attempt: { include: { student: { include: { user: true } } } },
      },
      orderBy: { answeredAt: "asc" },
    });
  }

  async submitManualScore(attemptAnswerId: string, data: {
    manualScore: number; feedback?: string; reviewedBy: string; aiSuggestedScore?: number;
  }) {
    const answer = await this.prisma.testAttemptAnswer.findUnique({
      where: { id: attemptAnswerId },
      include: { question: true },
    });
    if (!answer) throw new NotFoundError("Answer not found");

    if (data.manualScore > (answer.question as any).marks) {
      throw new BadRequestException(`Score ${data.manualScore} exceeds max marks ${(answer.question as any).marks}`);
    }

    return this.prisma.testAttemptAnswer.update({
      where: { id: attemptAnswerId },
      data: {
        manualScore: data.manualScore,
        feedback: data.feedback,
        reviewedBy: data.reviewedBy,
        aiSuggestedScore: data.aiSuggestedScore,
      },
    });
  }

  // ─── Per-Question Analytics ──────────────────────────────────────────────────

  async getQuestionAnalytics(testId: string) {
    const answers = await this.prisma.testAttemptAnswer.findMany({
      where: {
        attempt: { testId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "TIMEOUT"] } },
      },
      include: { question: true },
    });

    // Group by question
    const questionMap = new Map<string, { question: any; answers: any[] }>();
    for (const answer of answers) {
      if (!questionMap.has(answer.questionId)) {
        questionMap.set(answer.questionId, { question: answer.question, answers: [] });
      }
      questionMap.get(answer.questionId)!.answers.push(answer);
    }

    const analytics = [];
    for (const [questionId, data] of questionMap) {
      const total = data.answers.length;
      const correct = data.answers.filter((a) => a.isCorrect === true).length;
      const passRate = total > 0 ? +((correct / total) * 100).toFixed(1) : 0;

      // Common wrong answers (for MCQ types)
      const wrongAnswers = data.answers
        .filter((a) => !a.isCorrect)
        .flatMap((a) => a.selectedOptionIds ?? []);
      const wrongFrequency: Record<string, number> = {};
      wrongAnswers.forEach((id: string) => {
        wrongFrequency[id] = (wrongFrequency[id] ?? 0) + 1;
      });
      const topWrongOptions = Object.entries(wrongFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([optId, count]) => ({ optId, count }));

      // Difficulty calibration: if actual pass rate diverges from expected difficulty
      const expectedPassRate: Record<string, number> = { EASY: 80, MEDIUM: 55, HARD: 30 };
      const expected = expectedPassRate[(data.question as any).difficulty] ?? 55;
      const calibration = passRate > expected + 20 ? "EASIER_THAN_RATED" : passRate < expected - 20 ? "HARDER_THAN_RATED" : "CALIBRATED";

      analytics.push({
        questionId,
        questionText: (data.question as any).text,
        type: (data.question as any).type,
        difficulty: (data.question as any).difficulty,
        bloomLevel: (data.question as any).bloomLevel,
        totalAttempts: total,
        correctCount: correct,
        passRate,
        topWrongOptions,
        difficultyCalibration: calibration,
      });
    }

    return analytics.sort((a, b) => a.passRate - b.passRate); // sorted by hardest first
  }

  // ─── Internal Helpers ────────────────────────────────────────────────────────

  private async validateAttemptInProgress(attemptId: string) {
    const attempt = await this.prisma.testAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundError("Attempt not found");
    if (attempt.status !== "IN_PROGRESS") throw new BadRequestException("Attempt is not in progress");

    // Check if expired
    if (attempt.expiresAt && new Date() > attempt.expiresAt) {
      await this.submitAttempt(attemptId, "timeout");
      throw new BadRequestException("Test time has expired — attempt auto-submitted");
    }

    return attempt;
  }

  private async gradeAttempt(attemptId: string) {
    const answers = await this.prisma.testAttemptAnswer.findMany({
      where: { attemptId },
      include: { question: true },
    });

    const attempt = await this.prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { test: true },
    });

    let marksObtained = 0;
    let totalMarks = 0;

    const questionResults = await Promise.all(
      answers.map(async (answer: any) => {
        const question = answer.question as any;
        totalMarks += question.marks;

        const { isCorrect, autoScore } = this.autoGrade(question, answer);
        const negativeDeduction = !isCorrect && attempt?.test?.negativeMarkingEnabled ? (question.negativeMarks ?? 0) : 0;
        const score = Math.max(0, autoScore - negativeDeduction);
        marksObtained += score;

        // Update the answer record with grading
        await this.prisma.testAttemptAnswer.update({
          where: { id: answer.id },
          data: { isCorrect, autoScore: score },
        });

        return {
          questionId: answer.questionId,
          questionText: question.text,
          type: question.type,
          isCorrect,
          marksObtained: score,
          maxMarks: question.marks,
          correctAnswer: this.getCorrectAnswerForReview(question),
          studentAnswer: answer.selectedOptionIds?.length ? answer.selectedOptionIds : answer.textAnswer,
        };
      }),
    );

    // Add marks from questions not yet answered (0 for each)
    const attempt2 = await this.prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { test: { include: { testQuestions: { include: { question: true } } } } },
    });
    const answeredIds = new Set(answers.map((a: any) => a.questionId));
    for (const tq of (attempt2?.test?.testQuestions ?? [])) {
      if (!answeredIds.has((tq as any).questionId)) {
        totalMarks += (tq as any).question.marks;
      }
    }

    const test = await this.prisma.onlineTest.findUnique({ where: { id: attempt?.testId ?? "" } });
    const percentageScore = totalMarks > 0 ? +((marksObtained / totalMarks) * 100).toFixed(2) : 0;
    const isPassed = percentageScore >= (test?.passScore ?? 40);

    return { marksObtained, totalMarks, percentageScore, isPassed, questionResults };
  }

  private autoGrade(question: any, answer: any): { isCorrect: boolean; autoScore: number } {
    const subjectiveTypes = ["SHORT_ANSWER", "LONG_ANSWER"];
    if (subjectiveTypes.includes(question.type)) {
      // Cannot auto-grade subjective; score = 0 until manually reviewed
      return { isCorrect: false, autoScore: 0 };
    }

    if (question.type === "FILL_BLANK") {
      const correct = String(question.correctAnswer ?? "").trim().toLowerCase();
      const given = String(answer.textAnswer ?? "").trim().toLowerCase();
      const isCorrect = correct === given;
      return { isCorrect, autoScore: isCorrect ? question.marks : 0 };
    }

    if (question.type === "MATCH") {
      const expected: any[] = question.matchPairs ?? [];
      const given: any[] = answer.matchAnswers ?? [];
      const correctCount = expected.filter((pair: any) =>
        given.some((g: any) => g.left === pair.left && g.right === pair.right),
      ).length;
      const isCorrect = correctCount === expected.length;
      // Partial credit: proportional to correct matches
      const autoScore = +(question.marks * (correctCount / Math.max(expected.length, 1))).toFixed(2);
      return { isCorrect, autoScore };
    }

    // MCQ types
    const correctIds = new Set((question.options ?? []).filter((o: any) => o.isCorrect).map((o: any) => o.id));
    const selectedIds = new Set(answer.selectedOptionIds ?? []);

    if (question.type === "MCQ_MULTI") {
      // All correct options must be selected, no wrong ones
      const allCorrectSelected = [...correctIds].every((id) => selectedIds.has(id));
      const noWrongSelected = [...selectedIds].every((id) => correctIds.has(id));
      const isCorrect = allCorrectSelected && noWrongSelected;
      return { isCorrect, autoScore: isCorrect ? question.marks : 0 };
    }

    // MCQ_SINGLE, TRUE_FALSE, IMAGE_MCQ
    const selected = selectedIds.values().next().value;
    const isCorrect = !!selected && correctIds.has(selected);
    return { isCorrect, autoScore: isCorrect ? question.marks : 0 };
  }

  private getCorrectAnswerForReview(question: any): string | string[] {
    if (question.type === "FILL_BLANK") return question.correctAnswer ?? "";
    if (question.type === "MATCH") return question.matchPairs?.map((p: any) => `${p.left} → ${p.right}`) ?? [];
    const correctOptions = (question.options ?? []).filter((o: any) => o.isCorrect);
    return correctOptions.map((o: any) => o.id);
  }

  private sanitizeQuestionForDelivery(question: any) {
    // Strip isCorrect from options before sending to student
    const { options, ...rest } = question;
    return {
      ...rest,
      options: Array.isArray(options)
        ? options.map(({ isCorrect: _ic, ...opt }: any) => opt)
        : options,
    };
  }

  private async getAttemptState(attemptId: string, test: any) {
    const answeredQuestionIds = (
      await this.prisma.testAttemptAnswer.findMany({
        where: { attemptId },
        select: { questionId: true },
      })
    ).map((a: any) => a.questionId);

    const attempt = await this.prisma.testAttempt.findUnique({ where: { id: attemptId } });

    return {
      attemptId,
      testTitle: test.title,
      durationMinutes: test.durationMinutes,
      expiresAt: attempt?.expiresAt,
      questions: test.testQuestions.map((tq: any) => this.sanitizeQuestionForDelivery(tq.question)),
      totalQuestions: test.testQuestions.length,
      answeredQuestionIds,
      resumed: true,
    };
  }
}
