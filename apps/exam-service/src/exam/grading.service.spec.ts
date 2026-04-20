import { Test, TestingModule } from "@nestjs/testing";
import { GradingService } from "./grading.service";

describe("GradingService", () => {
  let service: GradingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GradingService],
    }).compile();

    service = module.get<GradingService>(GradingService);
    jest.clearAllMocks();
  });

  // ── getGrade (CBSE default) ───────────────────────────────────────────────────

  describe("getGrade — default CBSE scale (null config)", () => {
    it("returns A1 for 91%", () => {
      expect(service.getGrade(91, null)).toBe("A1");
    });

    it("returns A1 for 100%", () => {
      expect(service.getGrade(100, null)).toBe("A1");
    });

    it("returns A2 for 81%", () => {
      expect(service.getGrade(81, null)).toBe("A2");
    });

    it("returns A2 for 90%", () => {
      expect(service.getGrade(90, null)).toBe("A2");
    });

    it("returns B1 for 71%", () => {
      expect(service.getGrade(71, null)).toBe("B1");
    });

    it("returns B1 for 80%", () => {
      expect(service.getGrade(80, null)).toBe("B1");
    });

    it("returns B2 for 61%", () => {
      expect(service.getGrade(61, null)).toBe("B2");
    });

    it("returns B2 for 70%", () => {
      expect(service.getGrade(70, null)).toBe("B2");
    });

    it("returns C1 for 51%", () => {
      expect(service.getGrade(51, null)).toBe("C1");
    });

    it("returns C1 for 60%", () => {
      expect(service.getGrade(60, null)).toBe("C1");
    });

    it("returns C2 for 41%", () => {
      expect(service.getGrade(41, null)).toBe("C2");
    });

    it("returns D for 33%", () => {
      expect(service.getGrade(33, null)).toBe("D");
    });

    it("returns E for 32% (fail)", () => {
      expect(service.getGrade(32, null)).toBe("E");
    });

    it("returns E for 0%", () => {
      expect(service.getGrade(0, null)).toBe("E");
    });
  });

  // ── getGrade — ICSE scale ─────────────────────────────────────────────────────

  describe("getGrade — ICSE scale", () => {
    const icseCfg = { scale: "ICSE", passingPercentage: 33, grades: [] };

    it("returns A+ for 90%", () => {
      expect(service.getGrade(90, icseCfg)).toBe("A+");
    });

    it("returns A+ for 95%", () => {
      expect(service.getGrade(95, icseCfg)).toBe("A+");
    });

    it("returns A for 75%", () => {
      expect(service.getGrade(75, icseCfg)).toBe("A");
    });

    it("returns A for 89%", () => {
      expect(service.getGrade(89, icseCfg)).toBe("A");
    });

    it("returns B+ for 60%", () => {
      expect(service.getGrade(60, icseCfg)).toBe("B+");
    });

    it("returns B for 50%", () => {
      expect(service.getGrade(50, icseCfg)).toBe("B");
    });

    it("returns C for 40%", () => {
      expect(service.getGrade(40, icseCfg)).toBe("C");
    });

    it("returns F for 0%", () => {
      expect(service.getGrade(0, icseCfg)).toBe("F");
    });

    it("returns F for 32%", () => {
      expect(service.getGrade(32, icseCfg)).toBe("F");
    });
  });

  // ── getGrade — DISTINCTION_PASS scale ────────────────────────────────────────

  describe("getGrade — DISTINCTION_PASS scale", () => {
    const cfg = { scale: "DISTINCTION_PASS", passingPercentage: 35, grades: [] };

    it("returns Distinction for 75%", () => {
      expect(service.getGrade(75, cfg)).toBe("Distinction");
    });

    it("returns First Class for 60%", () => {
      expect(service.getGrade(60, cfg)).toBe("First Class");
    });

    it("returns Second Class for 50%", () => {
      expect(service.getGrade(50, cfg)).toBe("Second Class");
    });

    it("returns Pass for 35%", () => {
      expect(service.getGrade(35, cfg)).toBe("Pass");
    });

    it("returns Fail for 20%", () => {
      expect(service.getGrade(20, cfg)).toBe("Fail");
    });
  });

  // ── getGrade — CUSTOM scale ───────────────────────────────────────────────────

  describe("getGrade — CUSTOM scale", () => {
    const customCfg = {
      scale: "CUSTOM",
      passingPercentage: 40,
      grades: [
        { label: "Gold", minPercent: 80, maxPercent: 100 },
        { label: "Silver", minPercent: 60, maxPercent: 79 },
        { label: "Bronze", minPercent: 40, maxPercent: 59 },
        { label: "Fail", minPercent: 0, maxPercent: 39 },
      ],
    };

    it("returns Gold for 85%", () => {
      expect(service.getGrade(85, customCfg)).toBe("Gold");
    });

    it("returns Silver for 65%", () => {
      expect(service.getGrade(65, customCfg)).toBe("Silver");
    });

    it("returns Fail for 30%", () => {
      expect(service.getGrade(30, customCfg)).toBe("Fail");
    });
  });

  // ── getGradePoints ─────────────────────────────────────────────────────────────

  describe("getGradePoints", () => {
    it("returns 10 grade points for 95% on CBSE", () => {
      expect(service.getGradePoints(95, null)).toBe(10);
    });

    it("returns 9 grade points for 85% on CBSE", () => {
      expect(service.getGradePoints(85, null)).toBe(9);
    });

    it("returns 0 grade points for 20% on CBSE", () => {
      expect(service.getGradePoints(20, null)).toBe(0);
    });
  });

  // ── calculateCGPA ─────────────────────────────────────────────────────────────

  describe("calculateCGPA", () => {
    it("calculates mean correctly", () => {
      expect(service.calculateCGPA([10, 9, 8])).toBe(9);
    });

    it("handles tie — same CGPA for equal points", () => {
      expect(service.calculateCGPA([8, 8, 8])).toBe(8);
    });

    it("returns 0 for empty array", () => {
      expect(service.calculateCGPA([])).toBe(0);
    });

    it("rounds to 2 decimal places", () => {
      expect(service.calculateCGPA([10, 9, 7])).toBe(8.67);
    });
  });
});
