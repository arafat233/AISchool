import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

export type QuestionType = "RATING" | "MCQ" | "CHECKBOX" | "TEXT" | "NPS";

export type SurveyTypePreset =
  | "STUDENT_SATISFACTION" | "PARENT_FEEDBACK" | "TEACHER_360" | "STAFF_SELF_ASSESSMENT"
  | "POST_EVENT" | "COURSE_RATING" | "CANTEEN" | "PTM_EXPERIENCE" | "EXIT_INTERVIEW" | "TEACHER_PULSE" | "CUSTOM";

@Injectable()
export class SurveyService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Survey builder ───────────────────────────────────────────────────────────

  async createSurvey(schoolId: string, data: {
    title: string; description?: string; surveyType?: SurveyTypePreset;
    targetRole?: string; targetSectionIds?: string[]; targetGradeLevelIds?: string[];
    isAnonymous?: boolean; startsAt?: Date; endsAt?: Date; createdBy: string;
  }) {
    return this.prisma.survey.create({
      data: {
        schoolId, title: data.title, description: data.description,
        targetRole: data.targetRole as any,
        isAnonymous: data.isAnonymous ?? false,
        startsAt: data.startsAt, endsAt: data.endsAt,
        createdBy: data.createdBy,
        surveyType: data.surveyType ?? "CUSTOM",
        targetSectionIds: data.targetSectionIds ?? [],
        targetGradeLevelIds: data.targetGradeLevelIds ?? [],
      },
    });
  }

  async addQuestion(surveyId: string, data: {
    questionText: string; questionType: QuestionType;
    options?: string[]; isRequired?: boolean; orderIndex: number;
    conditionalLogic?: { dependsOn: string; showIfAnswer: string }; // conditional
    minValue?: number; maxValue?: number; // for RATING/NPS
  }) {
    return this.prisma.surveyQuestion.create({
      data: {
        surveyId,
        questionText: data.questionText,
        questionType: data.questionType,
        options: data.options ? { options: data.options } : undefined,
        isRequired: data.isRequired ?? true,
        sequence: data.orderIndex,
        conditionalLogic: data.conditionalLogic,
        minValue: data.minValue,
        maxValue: data.maxValue,
      },
    });
  }

  async updateQuestion(id: string, data: any) {
    return this.prisma.surveyQuestion.update({ where: { id }, data });
  }

  async deleteQuestion(id: string) {
    return this.prisma.surveyQuestion.delete({ where: { id } });
  }

  async getSurvey(id: string) {
    const s = await this.prisma.survey.findUnique({
      where: { id },
      include: { questions: { orderBy: { sequence: "asc" } } },
    });
    if (!s) throw new NotFoundError("Survey not found");
    return s;
  }

  async getSurveys(schoolId: string, surveyType?: string) {
    return this.prisma.survey.findMany({
      where: { schoolId, ...(surveyType ? { surveyType } : {}), isActive: true },
      include: { _count: { select: { responses: true, questions: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async publishSurvey(id: string) {
    return this.prisma.survey.update({ where: { id }, data: { isActive: true } });
  }

  // ─── Submit response ──────────────────────────────────────────────────────────

  async submitResponse(surveyId: string, respondentId: string | null, answers: Record<string, any>) {
    const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) throw new NotFoundError("Survey not found");
    if (!survey.isActive) throw new NotFoundError("Survey is not active");

    // Enforce anonymous mode
    const actualRespondentId = survey.isAnonymous ? null : respondentId;

    return this.prisma.surveyResponse.create({
      data: { surveyId, respondentId: actualRespondentId, answers },
    });
  }

  // ─── Results dashboard ────────────────────────────────────────────────────────

  async getResults(surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: { orderBy: { sequence: "asc" } }, responses: true },
    });
    if (!survey) throw new NotFoundError("Survey not found");

    const responseCount = survey.responses.length;
    const questionResults = survey.questions.map((q: any) => {
      const answers = survey.responses.map((r: any) => (r.answers as any)[q.id]).filter((a) => a !== undefined);

      let summary: any = {};

      if (q.questionType === "RATING" || q.questionType === "NPS") {
        const nums = answers.map(Number).filter((n) => !isNaN(n));
        const avg = nums.length > 0 ? +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : null;
        summary = { average: avg, count: nums.length };

        if (q.questionType === "NPS") {
          const promoters = nums.filter((n) => n >= 9).length;
          const detractors = nums.filter((n) => n <= 6).length;
          const passives = nums.length - promoters - detractors;
          const nps = nums.length > 0 ? +((promoters - detractors) / nums.length * 100).toFixed(1) : 0;
          summary = { ...summary, nps, promoters, passives, detractors };
        }
      } else if (q.questionType === "MCQ" || q.questionType === "CHECKBOX") {
        const opts: any = (q.options as any)?.options ?? [];
        const counts: Record<string, number> = {};
        for (const opt of opts) counts[opt] = 0;
        for (const a of answers) {
          const selected = Array.isArray(a) ? a : [a];
          for (const s of selected) if (s in counts) counts[s]++;
        }
        summary = { optionCounts: counts, totalResponses: answers.length };
      } else if (q.questionType === "TEXT") {
        // Basic sentiment tagging
        const positiveWords = ["good", "great", "excellent", "happy", "satisfied", "amazing"];
        const negativeWords = ["bad", "poor", "terrible", "unhappy", "dissatisfied", "horrible"];
        const tagged = answers.map((a) => {
          const text = String(a).toLowerCase();
          const pos = positiveWords.some((w) => text.includes(w));
          const neg = negativeWords.some((w) => text.includes(w));
          return { text: a, sentiment: pos ? "POSITIVE" : neg ? "NEGATIVE" : "NEUTRAL" };
        });
        const sentimentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
        for (const t of tagged) sentimentCounts[t.sentiment as keyof typeof sentimentCounts]++;
        summary = { textResponses: tagged, sentimentCounts };
      }

      return { questionId: q.id, questionText: q.questionText, questionType: q.questionType, responseCount: answers.length, summary };
    });

    return {
      surveyId,
      title: survey.title,
      totalResponses: responseCount,
      isAnonymous: survey.isAnonymous,
      questionResults,
    };
  }

  // ─── Trend comparison (same survey type across terms) ────────────────────────

  async getTrendComparison(schoolId: string, surveyType: string) {
    const surveys = await this.prisma.survey.findMany({
      where: { schoolId, surveyType },
      include: { responses: true, questions: true },
      orderBy: { createdAt: "asc" },
    });

    return surveys.map((s: any) => ({
      surveyId: s.id, title: s.title, createdAt: s.createdAt,
      responseCount: s.responses.length,
      questionCount: s.questions.length,
    }));
  }
}
