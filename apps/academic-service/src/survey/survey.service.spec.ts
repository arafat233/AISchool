import { Test, TestingModule } from "@nestjs/testing";
import { SurveyService } from "./survey.service";

const mockPrisma = {
  survey: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  surveyQuestion: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  surveyResponse: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
};

describe("SurveyService", () => {
  let service: SurveyService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [SurveyService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<SurveyService>(SurveyService);
  });

  describe("createSurvey", () => {
    it("should create survey with CUSTOM type by default", async () => {
      mockPrisma.survey.create.mockResolvedValueOnce({ id: "srv-1", title: "Student Feedback", surveyType: "CUSTOM" });
      const result = await service.createSurvey("sch-1", { title: "Student Feedback", createdBy: "admin-1" });
      expect(result.surveyType).toBe("CUSTOM");
    });

    it("should use provided survey type preset", async () => {
      mockPrisma.survey.create.mockResolvedValueOnce({ id: "srv-2", surveyType: "PARENT_FEEDBACK" });
      const result = await service.createSurvey("sch-1", {
        title: "Parent Feedback", createdBy: "admin-1", surveyType: "PARENT_FEEDBACK",
      });
      expect(result.surveyType).toBe("PARENT_FEEDBACK");
    });
  });

  describe("addQuestion", () => {
    it("should create question with options for MCQ type", async () => {
      mockPrisma.surveyQuestion.create.mockResolvedValueOnce({ id: "q-1", questionType: "MCQ" });
      const result = await service.addQuestion("srv-1", {
        questionText: "How satisfied are you?", questionType: "MCQ",
        options: ["Very", "Somewhat", "Not at all"], orderIndex: 1,
      });
      expect(result.questionType).toBe("MCQ");
    });

    it("should create RATING question without options", async () => {
      mockPrisma.surveyQuestion.create.mockResolvedValueOnce({ id: "q-2", questionType: "RATING" });
      const result = await service.addQuestion("srv-1", {
        questionText: "Rate the teacher", questionType: "RATING", orderIndex: 2, minValue: 1, maxValue: 5,
      });
      expect(result.questionType).toBe("RATING");
    });
  });

  describe("submitResponse", () => {
    it("should create response record", async () => {
      mockPrisma.surveyResponse.findFirst.mockResolvedValueOnce(null); // not already responded
      mockPrisma.surveyResponse.create.mockResolvedValueOnce({ id: "resp-1" });
      const result = await service.submitResponse("srv-1", "user-1", [
        { questionId: "q-1", answer: "Very" },
      ]);
      expect(result).toBeDefined();
    });

    it("should throw if user already responded", async () => {
      mockPrisma.surveyResponse.findFirst.mockResolvedValueOnce({ id: "resp-existing" });
      await expect(service.submitResponse("srv-1", "user-1", [])).rejects.toThrow();
    });
  });

  describe("getResults", () => {
    it("should return aggregated results", async () => {
      mockPrisma.surveyResponse.findMany.mockResolvedValueOnce([
        { answers: [{ questionId: "q-1", answer: "Very" }] },
        { answers: [{ questionId: "q-1", answer: "Somewhat" }] },
      ]);
      const result = await service.getResults("srv-1");
      expect(result).toBeDefined();
    });
  });
});
