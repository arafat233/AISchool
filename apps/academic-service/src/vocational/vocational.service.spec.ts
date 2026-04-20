import { Test, TestingModule } from "@nestjs/testing";
import { VocationalService, NsqfLevel } from "./vocational.service";
import { PrismaService } from "../prisma/prisma.service";

const mockPrisma = {
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
};

describe("VocationalService", () => {
  let service: VocationalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VocationalService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VocationalService>(VocationalService);
  });

  beforeEach(() => jest.clearAllMocks());

  // ─── createVocationalSubject ──────────────────────────────────────────────────

  describe("createVocationalSubject", () => {
    it("executes raw INSERT for vocational subject", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await service.createVocationalSubject("school-1", {
        name: "Retail Management",
        sector: "Retail",
        nsqfLevel: 3 as NsqfLevel,
        totalHours: 200,
        theoryHours: 80,
        practicalHours: 80,
        ojtHours: 40,
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("completes without throwing for valid inputs", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await expect(
        service.createVocationalSubject("school-1", {
          name: "IT",
          sector: "Technology",
          nsqfLevel: 2 as NsqfLevel,
          totalHours: 180,
          theoryHours: 60,
          practicalHours: 80,
          ojtHours: 40,
        }),
      ).resolves.toBeUndefined();
    });
  });

  // ─── addIndustryPartner ───────────────────────────────────────────────────────

  describe("addIndustryPartner", () => {
    it("executes raw INSERT for industry partner with MoU dates", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await service.addIndustryPartner("school-1", {
        companyName: "TechCorp Ltd",
        sector: "IT",
        contactName: "Raj Sharma",
        contactEmail: "raj@techcorp.com",
        contactPhone: "9876543210",
        moUSignedDate: new Date("2025-01-01"),
        moUExpiryDate: new Date("2026-01-01"),
        capacityPerBatch: 30,
        address: "Bengaluru, Karnataka",
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  // ─── assignOJT ────────────────────────────────────────────────────────────────

  describe("assignOJT", () => {
    it("creates OJT placement via raw INSERT", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await service.assignOJT("school-1", {
        studentId: "stu-1",
        subjectId: "subj-1",
        partnerId: "partner-1",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-07-31"),
        supervisorName: "Mr. Kumar",
        supervisorContact: "9000000001",
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  // ─── recordOJTAttendance ──────────────────────────────────────────────────────

  describe("recordOJTAttendance", () => {
    it("inserts attendance record with present=true", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await service.recordOJTAttendance("placement-1", new Date("2025-06-10"), true, "Completed site visit");

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("inserts attendance record with present=false and no notes", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await service.recordOJTAttendance("placement-1", new Date("2025-06-11"), false);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  // ─── recordCompetencyAssessment ───────────────────────────────────────────────

  describe("recordCompetencyAssessment", () => {
    it("inserts competency assessment via raw query", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await service.recordCompetencyAssessment("school-1", {
        studentId: "stu-1",
        subjectId: "subj-1",
        competencyId: "comp-1",
        assessorType: "INTERNAL",
        assessorId: "staff-1",
        score: 85,
        maxScore: 100,
        status: "ACHIEVED",
        date: new Date("2025-06-20"),
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  // ─── checkNsqfCertificateEligibility ─────────────────────────────────────────

  describe("checkNsqfCertificateEligibility", () => {
    it("returns eligible=true when all competencies ACHIEVED and OJT hours met", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ total: "4", achieved: "4" }])         // competencies
        .mockResolvedValueOnce([{ hours_completed: "40" }])              // ojt attendance
        .mockResolvedValueOnce([{ ojt_hours: "40" }]);                   // subject ojt requirement

      const result = await service.checkNsqfCertificateEligibility("stu-1", "subj-1");

      expect(result.eligible).toBe(true);
      expect(result.completedCompetencies).toBe(4);
      expect(result.totalCompetencies).toBe(4);
      expect(result.ojtHoursCompleted).toBe(40);
      expect(result.ojtHoursRequired).toBe(40);
    });

    it("returns eligible=false when OJT hours are short", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ total: "4", achieved: "4" }])
        .mockResolvedValueOnce([{ hours_completed: "20" }])              // only 20 of 40 done
        .mockResolvedValueOnce([{ ojt_hours: "40" }]);

      const result = await service.checkNsqfCertificateEligibility("stu-1", "subj-1");

      expect(result.eligible).toBe(false);
      expect(result.ojtHoursCompleted).toBe(20);
      expect(result.ojtHoursRequired).toBe(40);
    });

    it("returns eligible=false when not all competencies achieved", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ total: "4", achieved: "2" }])          // 2 of 4 achieved
        .mockResolvedValueOnce([{ hours_completed: "40" }])
        .mockResolvedValueOnce([{ ojt_hours: "40" }]);

      const result = await service.checkNsqfCertificateEligibility("stu-1", "subj-1");

      expect(result.eligible).toBe(false);
      expect(result.completedCompetencies).toBe(2);
      expect(result.totalCompetencies).toBe(4);
    });

    it("returns eligible=false when zero total competencies", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ total: "0", achieved: "0" }])
        .mockResolvedValueOnce([{ hours_completed: "40" }])
        .mockResolvedValueOnce([{ ojt_hours: "40" }]);

      const result = await service.checkNsqfCertificateEligibility("stu-1", "subj-1");

      expect(result.eligible).toBe(false);
    });
  });

  // ─── getHolisticProgressCard ──────────────────────────────────────────────────

  describe("getHolisticProgressCard", () => {
    it("returns all domain competencies and FLN data", async () => {
      const cognitiveData = [{ domain: "COGNITIVE", description: "Critical thinking", status: "ACHIEVED" }];
      const physicalData = [{ domain: "PHYSICAL", description: "Coordination", status: "ACHIEVED" }];
      const socialData = [{ domain: "SOCIAL", description: "Teamwork", status: "PARTIAL" }];
      const emotionalData = [{ domain: "EMOTIONAL", description: "Empathy", status: "ACHIEVED" }];
      const flnData = [{ fln_reading_level: "GRADE_LEVEL", fln_numeracy_level: "GRADE_LEVEL", fln_assessed_at: new Date() }];

      mockPrisma.$queryRaw
        .mockResolvedValueOnce(cognitiveData)
        .mockResolvedValueOnce(physicalData)
        .mockResolvedValueOnce(socialData)
        .mockResolvedValueOnce(emotionalData)
        .mockResolvedValueOnce(flnData);

      const result = await service.getHolisticProgressCard("stu-1", "term-1");

      expect(result.studentId).toBe("stu-1");
      expect(result.termId).toBe("term-1");
      expect(result.cognitive).toEqual(cognitiveData);
      expect(result.physical).toEqual(physicalData);
      expect(result.social).toEqual(socialData);
      expect(result.emotional).toEqual(emotionalData);
      expect(result.fln).toEqual(flnData[0]);
      expect(result.generatedAt).toBeDefined();
    });

    it("sets fln to null when no FLN data available", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([])  // cognitive
        .mockResolvedValueOnce([])  // physical
        .mockResolvedValueOnce([])  // social
        .mockResolvedValueOnce([])  // emotional
        .mockResolvedValueOnce([]); // fln empty

      const result = await service.getHolisticProgressCard("stu-new", "term-1");

      expect(result.fln).toBeNull();
    });
  });

  // ─── updateFlnLevel ───────────────────────────────────────────────────────────

  describe("updateFlnLevel", () => {
    it("executes raw UPDATE for FLN levels", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await service.updateFlnLevel("stu-1", "teacher-1", "GRADE_LEVEL", "BELOW_GRADE");

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getFlnDashboard ──────────────────────────────────────────────────────────

  describe("getFlnDashboard", () => {
    it("returns FLN aggregate for grades 1-3", async () => {
      const dashboardData = [
        { class_name: "Grade 1", total_students: "25", reading_at_grade: "20", reading_below_grade: "5", numeracy_at_grade: "18", numeracy_below_grade: "7" },
        { class_name: "Grade 2", total_students: "22", reading_at_grade: "19", reading_below_grade: "3", numeracy_at_grade: "17", numeracy_below_grade: "5" },
        { class_name: "Grade 3", total_students: "23", reading_at_grade: "21", reading_below_grade: "2", numeracy_at_grade: "20", numeracy_below_grade: "3" },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(dashboardData);

      const result = await service.getFlnDashboard("school-1", ["gl-1", "gl-2", "gl-3"]);

      expect(result).toEqual(dashboardData);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("returns empty array when no matching students", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getFlnDashboard("school-1", ["gl-unknown"]);

      expect(result).toEqual([]);
    });
  });
});
