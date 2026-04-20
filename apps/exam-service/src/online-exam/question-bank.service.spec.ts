import { Test, TestingModule } from "@nestjs/testing";
import { QuestionBankService } from "./question-bank.service";
import { BadRequestException } from "@nestjs/common";

const mockPrisma = {
  question: {
    create: jest.fn(), findMany: jest.fn(), findUniqueOrThrow: jest.fn(),
    update: jest.fn(), count: jest.fn(),
  },
};

describe("QuestionBankService", () => {
  let service: QuestionBankService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionBankService,
        { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<QuestionBankService>(QuestionBankService);
  });

  describe("createQuestion", () => {
    it("should create MCQ question with options", async () => {
      mockPrisma.question.create.mockResolvedValueOnce({ id: "q-1", type: "MCQ_SINGLE" });
      const result = await service.createQuestion("sch-1", {
        type: "MCQ_SINGLE", text: "What is 2+2?", subjectId: "sub-1",
        difficulty: "EASY", marks: 1,
        options: [
          { id: "o1", text: "3", isCorrect: false },
          { id: "o2", text: "4", isCorrect: true },
        ],
      });
      expect(result.type).toBe("MCQ_SINGLE");
    });

    it("should throw BadRequestException when MCQ has no options", async () => {
      await expect(service.createQuestion("sch-1", {
        type: "MCQ_SINGLE", text: "Question?", subjectId: "sub-1",
        difficulty: "EASY", marks: 1, options: [],
      })).rejects.toBeInstanceOf(BadRequestException);
    });

    it("should create SHORT_ANSWER question without options", async () => {
      mockPrisma.question.create.mockResolvedValueOnce({ id: "q-2", type: "SHORT_ANSWER" });
      const result = await service.createQuestion("sch-1", {
        type: "SHORT_ANSWER", text: "Explain gravity?", subjectId: "sub-1",
        difficulty: "MEDIUM", marks: 5,
      });
      expect(result.type).toBe("SHORT_ANSWER");
    });
  });

  describe("getRandomQuestions", () => {
    it("should return questions up to the requested count", async () => {
      mockPrisma.question.findMany.mockResolvedValueOnce([
        { id: "q-1" }, { id: "q-2" }, { id: "q-3" },
      ]);
      const result = await service.getRandomQuestions("sch-1", "sub-1", { count: 3 });
      expect(result).toHaveLength(3);
    });

    it("should filter by difficulty when provided", async () => {
      mockPrisma.question.findMany.mockResolvedValueOnce([{ id: "q-1" }]);
      await service.getRandomQuestions("sch-1", "sub-1", { count: 5, difficulty: "HARD" });
      expect(mockPrisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ difficulty: "HARD" }) })
      );
    });
  });

  describe("archiveQuestion", () => {
    it("should set isArchived to true", async () => {
      mockPrisma.question.update.mockResolvedValueOnce({ id: "q-1", isArchived: true });
      const result = await service.archiveQuestion("q-1");
      expect(result.isArchived).toBe(true);
      expect(mockPrisma.question.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isArchived: true }) })
      );
    });
  });
});
