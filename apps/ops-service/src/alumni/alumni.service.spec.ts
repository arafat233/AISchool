import { Test, TestingModule } from "@nestjs/testing";
import { AlumniService } from "./alumni.service";
import { PrismaService } from "@school-erp/database";
import { ConflictError, NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  alumniProfile: {
    upsert: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  alumniJobPosting: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  jobApplication: { upsert: jest.fn() },
  placementRecord: { create: jest.fn(), findMany: jest.fn() },
  mentorMenteeLink: { upsert: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  donationCampaign: { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  donation: { create: jest.fn() },
  $transaction: jest.fn(),
};

describe("AlumniService", () => {
  let service: AlumniService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlumniService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(AlumniService);
    jest.clearAllMocks();
  });

  // ─── registerAlumni ──────────────────────────────────────────────────────────

  describe("registerAlumni", () => {
    it("upserts the alumni profile", async () => {
      const profile = { id: "a1", schoolId: "s1", studentId: "st1", graduationYear: 2024 };
      mockPrisma.alumniProfile.upsert.mockResolvedValue(profile);

      const result = await service.registerAlumni("s1", "st1", 2024);

      expect(mockPrisma.alumniProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { studentId: "st1" }, create: expect.objectContaining({ graduationYear: 2024 }) }),
      );
      expect(result).toBe(profile);
    });
  });

  // ─── searchDirectory ─────────────────────────────────────────────────────────

  describe("searchDirectory", () => {
    it("filters by batchYear and city", async () => {
      mockPrisma.alumniProfile.findMany.mockResolvedValue([]);

      await service.searchDirectory("s1", { batchYear: 2020, city: "Bengaluru" });

      expect(mockPrisma.alumniProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            graduationYear: 2020,
            city: expect.objectContaining({ contains: "Bengaluru" }),
          }),
        }),
      );
    });

    it("returns only opt-in alumni", async () => {
      mockPrisma.alumniProfile.findMany.mockResolvedValue([]);
      await service.searchDirectory("s1", {});
      expect(mockPrisma.alumniProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isDirectoryOptIn: true }) }),
      );
    });
  });

  // ─── applyForJob ─────────────────────────────────────────────────────────────

  describe("applyForJob", () => {
    it("throws ConflictError if job is not approved", async () => {
      mockPrisma.alumniJobPosting.findUnique.mockResolvedValue({ id: "j1", status: "PENDING" });
      await expect(service.applyForJob("j1", "u1", "STUDENT")).rejects.toThrow(ConflictError);
    });

    it("creates a job application for an approved job", async () => {
      mockPrisma.alumniJobPosting.findUnique.mockResolvedValue({ id: "j1", status: "APPROVED" });
      mockPrisma.jobApplication.upsert.mockResolvedValue({ id: "app1" });

      await service.applyForJob("j1", "u1", "ALUMNI");

      expect(mockPrisma.jobApplication.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ applicantType: "ALUMNI" }) }),
      );
    });
  });

  // ─── getPlacementAnalytics ───────────────────────────────────────────────────

  describe("getPlacementAnalytics", () => {
    it("groups placements by industry", async () => {
      mockPrisma.alumniProfile.findMany.mockResolvedValue([{ id: "a1" }, { id: "a2" }]);
      mockPrisma.placementRecord.findMany.mockResolvedValue([
        { alumniId: "a1", industry: "IT" },
        { alumniId: "a2", industry: "IT" },
        { alumniId: "a1", industry: "Finance" },
      ]);

      const result = await service.getPlacementAnalytics("s1");

      expect(result.totalPlacements).toBe(3);
      expect(result.byIndustry["IT"]).toBe(2);
      expect(result.byIndustry["Finance"]).toBe(1);
    });

    it("labels missing industry as Unknown", async () => {
      mockPrisma.alumniProfile.findMany.mockResolvedValue([{ id: "a1" }]);
      mockPrisma.placementRecord.findMany.mockResolvedValue([{ alumniId: "a1", industry: null }]);

      const result = await service.getPlacementAnalytics("s1");

      expect(result.byIndustry["Unknown"]).toBe(1);
    });
  });

  // ─── recordDonation ──────────────────────────────────────────────────────────

  describe("recordDonation", () => {
    it("creates donation and increments campaign total in a transaction", async () => {
      const donation = { id: "d1" };
      mockPrisma.$transaction.mockImplementation(async (ops: any[]) => ops.map((op: any) => op));
      mockPrisma.donation.create.mockResolvedValue(donation);
      mockPrisma.donationCampaign.update.mockResolvedValue({});

      await service.recordDonation("c1", { donorId: "u1", donorType: "ALUMNI", amountRs: 5000 });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ─── getDonorImpactReport ────────────────────────────────────────────────────

  describe("getDonorImpactReport", () => {
    it("throws NotFoundError when campaign does not exist", async () => {
      mockPrisma.donationCampaign.findUnique.mockResolvedValue(null);
      await expect(service.getDonorImpactReport("c1")).rejects.toThrow(NotFoundError);
    });

    it("calculates pct achieved correctly", async () => {
      mockPrisma.donationCampaign.findUnique.mockResolvedValue({
        id: "c1", title: "T", targetAmtRs: 100000, raisedAmtRs: 50000,
        donations: [{ donorType: "PARENT", amountRs: 50000 }],
      });

      const result = await service.getDonorImpactReport("c1");

      expect(result.pctAchieved).toBe(50);
    });
  });
});
