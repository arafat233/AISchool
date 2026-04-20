import { Test, TestingModule } from "@nestjs/testing";
import { IepService } from "./iep.service";

const mockPrisma = {
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
  cwsnProfile: { upsert: jest.fn(), findFirst: jest.fn() },
  iepPlan: { create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  iepTermReview: { create: jest.fn() },
  examAccommodation: { upsert: jest.fn(), findMany: jest.fn() },
  specialEdSession: { create: jest.fn() },
};

describe("IepService", () => {
  let service: IepService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [IepService, { provide: "PrismaService", useValue: mockPrisma }],
    })
      .overrideProvider(IepService)
      .useValue(new (require("./iep.service").IepService)(mockPrisma))
      .compile();
    service = module.get<IepService>(IepService);
  });

  describe("setCwsnProfile", () => {
    it("should upsert CWSN profile with disability info", async () => {
      mockPrisma.cwsnProfile.upsert.mockResolvedValueOnce({ id: "cwsn-1", disabilityType: "VISUAL" });
      const result = await service.setCwsnProfile("stu-1", {
        disabilityType: "VISUAL", udid: "UD123", govtBenefits: ["Scholarship"] } as any);
      expect(mockPrisma.cwsnProfile.upsert).toHaveBeenCalled();
      expect(result.disabilityType).toBe("VISUAL");
    });
  });

  describe("createIep", () => {
    it("should create IEP plan with goals array", async () => {
      mockPrisma.iepPlan.create.mockResolvedValueOnce({ id: "iep-1", goals: [{ goal: "Read independently" }] });
      const result = await service.createIep("stu-1", {
        academicYear: "2025-26", goals: [{ goal: "Read independently" }],
        startDate: "2025-06-01", reviewDate: "2025-12-01",
      } as any);
      expect(result.id).toBe("iep-1");
      expect(result.goals).toHaveLength(1);
    });
  });

  describe("recordParentSignOff", () => {
    it("should set parentSignedAt timestamp", async () => {
      mockPrisma.iepPlan.update.mockResolvedValueOnce({ id: "iep-1", parentSignedAt: new Date() });
      const result = await service.recordParentSignOff("iep-1");
      expect(result.parentSignedAt).toBeInstanceOf(Date);
    });
  });

  describe("conductTermReview", () => {
    it("should create review record and return", async () => {
      mockPrisma.iepTermReview.create.mockResolvedValueOnce({ id: "rev-1", term: "Term 1" });
      const result = await service.conductTermReview("iep-1", { term: "Term 1", notes: "Good progress" } as any);
      expect(result.id).toBe("rev-1");
    });
  });

  describe("setExamAccommodations", () => {
    it("should upsert accommodations for student+exam", async () => {
      mockPrisma.examAccommodation.upsert.mockResolvedValueOnce({ id: "acc-1", accommodations: ["EXTRA_TIME"] });
      const result = await service.setExamAccommodations("stu-1", "exam-1", ["EXTRA_TIME", "SEPARATE_ROOM"]);
      expect(result.accommodations).toContain("EXTRA_TIME");
    });
  });

  describe("getStudentExamAccommodations", () => {
    it("should return accommodations for the student", async () => {
      mockPrisma.examAccommodation.findMany.mockResolvedValueOnce([{ accommodations: ["SCRIBE"] }]);
      const result = await service.getStudentExamAccommodations("stu-1");
      expect(result).toHaveLength(1);
    });
  });

  describe("logSession", () => {
    it("should create a special education session record", async () => {
      mockPrisma.specialEdSession.create.mockResolvedValueOnce({ id: "sess-1" });
      const result = await service.logSession("stu-1", { educatorId: "edu-1", notes: "Reading session" } as any);
      expect(result.id).toBe("sess-1");
    });
  });

  describe("getCwsnComplianceReport", () => {
    it("should return counts by disability type", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { disabilityType: "VISUAL", count: 3 },
        { disabilityType: "HEARING", count: 2 },
      ]);
      const result = await service.getCwsnComplianceReport("sch-1");
      expect(result).toHaveLength(2);
    });
  });
});
