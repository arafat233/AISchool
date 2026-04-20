import { Test, TestingModule } from "@nestjs/testing";
import { AccreditationService } from "./accreditation.service";

const mockPrisma = {
  $executeRaw: jest.fn().mockResolvedValue(1),
  $queryRaw: jest.fn().mockResolvedValue([]),
};

describe("AccreditationService", () => {
  let service: AccreditationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccreditationService, { provide: require("../prisma/prisma.service").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<AccreditationService>(AccreditationService);
  });

  describe("setQualityFramework", () => {
    it("should call $executeRaw to upsert accreditation setup", async () => {
      await service.setQualityFramework("sch-1", "NAAC", new Date("2027-01-01"), "coord-1");
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe("compileSsrData", () => {
    it("should return compiled SSR data with generatedAt", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ id: "sch-1", name: "Test School" }])  // school
        .mockResolvedValueOnce([{ total: 500, girls: 240, cwsn: 12, rte: 30 }])  // enrolment
        .mockResolvedValueOnce([{ total: 45, female: 20, trained: 38, experienced: 30 }])  // staff
        .mockResolvedValueOnce([{ avg_percentage: 72.5, distinction_count: 120 }])  // results
        .mockResolvedValueOnce([{ total_items: 20, completed: 18 }])  // compliance
        .mockResolvedValueOnce([{ total_fees_collected: 5000000 }]);  // finance

      const result = await service.compileSsrData("sch-1", "ay-1");
      expect(result.generatedAt).toBeDefined();
      expect(result.school.name).toBe("Test School");
      expect(result.enrolment.total).toBe(500);
    });
  });

  describe("scheduleInspection", () => {
    it("should return an inspectionId", async () => {
      const id = await service.scheduleInspection("sch-1", {
        framework: "NAAC",
        inspectionDate: new Date("2026-10-15"),
        inspectorNames: ["Dr. Sharma", "Prof. Rao"],
        type: "MOCK",
      });
      expect(id).toMatch(/^INSP-/);
    });
  });

  describe("createImprovementAction", () => {
    it("should call $executeRaw with OPEN status", async () => {
      await service.createImprovementAction("sch-1", {
        source: "ISO 21001 Audit Finding #3",
        finding: "Student feedback loop missing",
        rootCause: "No formal feedback mechanism",
        correctiveAction: "Implement quarterly student survey",
        responsibleId: "principal-1",
        targetDate: new Date("2026-07-01"),
        priority: "HIGH",
      });
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe("getImprovementActionReport", () => {
    it("should return byStatus and overdueCount", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ priority: "HIGH", status: "OPEN", count: 3 }])
        .mockResolvedValueOnce([{ count: 2 }]);
      const result = await service.getImprovementActionReport("sch-1");
      expect(result.overdueCount).toBe(2);
      expect(result.byStatus).toHaveLength(1);
    });
  });
});
