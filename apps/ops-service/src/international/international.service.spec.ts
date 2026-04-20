import { Test, TestingModule } from "@nestjs/testing";
import { InternationalService } from "./international.service";

jest.mock("axios");

const mockPrisma = {
  $executeRaw: jest.fn().mockResolvedValue(1),
  $queryRaw: jest.fn().mockResolvedValue([]),
};

describe("InternationalService", () => {
  let service: InternationalService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [InternationalService, { provide: require("../prisma/prisma.service").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<InternationalService>(InternationalService);
  });

  describe("saveUoiPlan", () => {
    it("should call $executeRaw to insert IB UoI plan", async () => {
      await service.saveUoiPlan("sch-1", {
        classId: "class-1",
        academicYearId: "ay-1",
        theme: "WHO_WE_ARE",
        centralIdea: "Families share common values",
        lines_of_inquiry: ["Family structures", "Values"],
        keyConceptsAddressed: ["Connection"],
        subjectAreas: ["Language", "Social Studies"],
        teacherId: "teacher-1",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2026-09-30"),
      });
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe("recordLearnerProfileAssessment", () => {
    it("should upsert learner profile attributes", async () => {
      await service.recordLearnerProfileAssessment("stu-1", "term-1", {
        inquirer: "ALWAYS",
        thinker: "USUALLY",
        communicator: "SOMETIMES",
      });
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe("recordAtlSkillsAssessment", () => {
    it("should insert ATL skill assessments", async () => {
      await service.recordAtlSkillsAssessment("stu-1", "term-1", [
        { category: "COMMUNICATION", skill: "Reading comprehension", level: "EXCELLENT" },
        { category: "THINKING", skill: "Critical analysis", level: "GOOD" },
      ]);
      // Called once per skill
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    });
  });
});
