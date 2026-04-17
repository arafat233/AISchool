import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";
import ExcelJS from "exceljs";

export type QuestionType =
  | "MCQ_SINGLE"
  | "MCQ_MULTI"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "MATCH"
  | "SHORT_ANSWER"
  | "LONG_ANSWER"
  | "IMAGE_MCQ";

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";
export type BloomLevel = "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE";

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string;
}

export interface MatchPair {
  left: string;
  right: string;
}

@Injectable()
export class QuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Question CRUD ──────────────────────────────────────────────────────────

  async createQuestion(schoolId: string, data: {
    type: QuestionType;
    text: string;
    imageUrl?: string;
    subjectId: string;
    gradeLevelId?: string;
    topic?: string;
    difficulty: DifficultyLevel;
    bloomLevel?: BloomLevel;
    marks: number;
    negativeMarks?: number;
    options?: QuestionOption[];
    matchPairs?: MatchPair[];
    correctAnswer?: string;     // for FILL_BLANK / TRUE_FALSE
    explanation?: string;
    tags?: string[];
  }) {
    this.validateQuestionData(data);

    return this.prisma.question.create({
      data: {
        schoolId,
        type: data.type,
        text: data.text,
        imageUrl: data.imageUrl,
        subjectId: data.subjectId,
        gradeLevelId: data.gradeLevelId,
        topic: data.topic,
        difficulty: data.difficulty,
        bloomLevel: data.bloomLevel,
        marks: data.marks,
        negativeMarks: data.negativeMarks ?? 0,
        options: data.options as any ?? [],
        matchPairs: data.matchPairs as any ?? [],
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
        tags: data.tags ?? [],
      },
    });
  }

  async getQuestions(schoolId: string, filters?: {
    subjectId?: string;
    gradeLevelId?: string;
    difficulty?: DifficultyLevel;
    bloomLevel?: BloomLevel;
    type?: QuestionType;
    topic?: string;
    search?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }) {
    const where: any = { schoolId };
    if (filters?.subjectId) where.subjectId = filters.subjectId;
    if (filters?.gradeLevelId) where.gradeLevelId = filters.gradeLevelId;
    if (filters?.difficulty) where.difficulty = filters.difficulty;
    if (filters?.bloomLevel) where.bloomLevel = filters.bloomLevel;
    if (filters?.type) where.type = filters.type;
    if (filters?.topic) where.topic = { contains: filters.topic, mode: "insensitive" };
    if (filters?.search) where.text = { contains: filters.search, mode: "insensitive" };
    if (filters?.tags?.length) where.tags = { hasSome: filters.tags };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        include: { subject: true },
        orderBy: { createdAt: "desc" },
        take: filters?.limit ?? 50,
        skip: filters?.offset ?? 0,
      }),
    ]);

    return { total, items };
  }

  async getQuestion(id: string) {
    const q = await this.prisma.question.findUnique({ where: { id }, include: { subject: true } });
    if (!q) throw new NotFoundError("Question not found");
    return q;
  }

  async updateQuestion(id: string, data: Partial<Parameters<typeof this.createQuestion>[1]>) {
    await this.getQuestion(id); // verify exists
    return this.prisma.question.update({
      where: { id },
      data: {
        ...(data.text !== undefined ? { text: data.text } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        ...(data.difficulty !== undefined ? { difficulty: data.difficulty } : {}),
        ...(data.bloomLevel !== undefined ? { bloomLevel: data.bloomLevel } : {}),
        ...(data.topic !== undefined ? { topic: data.topic } : {}),
        ...(data.marks !== undefined ? { marks: data.marks } : {}),
        ...(data.negativeMarks !== undefined ? { negativeMarks: data.negativeMarks } : {}),
        ...(data.options !== undefined ? { options: data.options as any } : {}),
        ...(data.matchPairs !== undefined ? { matchPairs: data.matchPairs as any } : {}),
        ...(data.correctAnswer !== undefined ? { correctAnswer: data.correctAnswer } : {}),
        ...(data.explanation !== undefined ? { explanation: data.explanation } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
      },
    });
  }

  async deleteQuestion(id: string) {
    await this.getQuestion(id);
    return this.prisma.question.delete({ where: { id } });
  }

  // ─── Bulk Import ─────────────────────────────────────────────────────────────

  /**
   * Parses an Excel workbook and creates questions in bulk.
   * Expected columns: Type | Text | Options (pipe-separated) | CorrectAnswer |
   *                   Subject | GradeLevel | Topic | Difficulty | BloomLevel | Marks | NegativeMarks | Explanation | Tags
   */
  async bulkImportFromExcel(schoolId: string, fileBuffer: Buffer): Promise<{ created: number; errors: string[] }> {
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(fileBuffer as any);
    const sheet = workbook.getWorksheet(1);
    if (!sheet) throw new BadRequestException("No worksheet found in Excel file");

    const errors: string[] = [];
    const toCreate: Parameters<typeof this.createQuestion>[1][] = [];

    // Fetch subjects for name → id mapping
    const subjects = await this.prisma.subject.findMany({ where: { schoolId } });
    const subjectMap = new Map(subjects.map((s: { name: string; id: string }) => [s.name.toLowerCase(), s.id]));

    const gradeLevels = await this.prisma.gradeLevel.findMany({ where: { schoolId } });
    const gradeLevelMap = new Map(gradeLevels.map((g: { name: string; id: string }) => [g.name.toLowerCase(), g.id]));

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const cells = (row.values as any[]).slice(1); // Remove leading undefined

      const [rawType, text, rawOptions, correctAnswer, subjectName, gradeLevelName, topic, difficulty, bloomLevel, marks, negativeMarks, explanation, rawTags] = cells;

      if (!rawType || !text) {
        errors.push(`Row ${rowNumber}: missing Type or Text`);
        return;
      }

      const type = String(rawType).trim().toUpperCase() as QuestionType;
      const subjectId = subjectMap.get(String(subjectName ?? "").toLowerCase());
      if (!subjectId) {
        errors.push(`Row ${rowNumber}: subject '${subjectName}' not found`);
        return;
      }

      const gradeLevelId = gradeLevelName ? gradeLevelMap.get(String(gradeLevelName).toLowerCase()) : undefined;

      let options: QuestionOption[] | undefined;
      if (rawOptions) {
        const parts = String(rawOptions).split("|").map((p: string) => p.trim());
        const correctParts = String(correctAnswer ?? "").split("|").map((p: string) => p.trim().toUpperCase());
        options = parts.map((text: string, i: number) => ({
          id: `opt_${i + 1}`,
          text,
          isCorrect: correctParts.includes(String.fromCharCode(65 + i)) || correctParts.includes(String(i + 1)),
        }));
      }

      toCreate.push({
        type,
        text: String(text).trim(),
        subjectId: subjectId as string,
        gradeLevelId: gradeLevelId as string | undefined,
        topic: topic ? String(topic).trim() : undefined,
        difficulty: (String(difficulty ?? "MEDIUM").toUpperCase() as DifficultyLevel) || "MEDIUM",
        bloomLevel: bloomLevel ? (String(bloomLevel).toUpperCase() as BloomLevel) : undefined,
        marks: Number(marks) || 1,
        negativeMarks: Number(negativeMarks) || 0,
        options,
        correctAnswer: correctAnswer && !options ? String(correctAnswer).trim() : undefined,
        explanation: explanation ? String(explanation).trim() : undefined,
        tags: rawTags ? String(rawTags).split(",").map((t: string) => t.trim()) : [],
      });
    });

    // Bulk create
    let created = 0;
    for (const q of toCreate) {
      try {
        await this.createQuestion(schoolId, q);
        created++;
      } catch (err: any) {
        errors.push(`Failed to save question: ${err.message}`);
      }
    }

    return { created, errors };
  }

  // ─── Bloom's Distribution (for a given set of question IDs) ─────────────────

  async getBloomsDistribution(questionIds: string[]): Promise<Record<BloomLevel | "UNTAGGED", number>> {
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { bloomLevel: true },
    });

    const dist: Record<string, number> = {
      REMEMBER: 0, UNDERSTAND: 0, APPLY: 0, ANALYZE: 0, EVALUATE: 0, CREATE: 0, UNTAGGED: 0,
    };
    for (const q of questions) {
      const key = q.bloomLevel ?? "UNTAGGED";
      dist[key] = (dist[key] ?? 0) + 1;
    }
    return dist as Record<BloomLevel | "UNTAGGED", number>;
  }

  // ─── Internal helpers ───────────────────────────────────────────────────────

  private validateQuestionData(data: { type: QuestionType; options?: QuestionOption[]; correctAnswer?: string }) {
    const objectiveTypes = ["MCQ_SINGLE", "MCQ_MULTI", "TRUE_FALSE", "IMAGE_MCQ"];
    if (objectiveTypes.includes(data.type)) {
      if (!data.options?.length) {
        throw new BadRequestException(`Question type ${data.type} requires options`);
      }
      if (data.type === "TRUE_FALSE" && data.options.length !== 2) {
        throw new BadRequestException("True/False questions must have exactly 2 options");
      }
      const correctCount = data.options.filter((o) => o.isCorrect).length;
      if (data.type === "MCQ_SINGLE" && correctCount !== 1) {
        throw new BadRequestException("MCQ_SINGLE must have exactly 1 correct option");
      }
      if (data.type === "MCQ_MULTI" && correctCount < 2) {
        throw new BadRequestException("MCQ_MULTI must have at least 2 correct options");
      }
    }
  }
}
