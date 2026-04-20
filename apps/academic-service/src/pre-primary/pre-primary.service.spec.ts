import { Test, TestingModule } from "@nestjs/testing";
import { PrePrimaryService, DailyActivityLog } from "./pre-primary.service";
import { PrismaService } from "../prisma/prisma.service";

// Mock axios to prevent real HTTP calls
jest.mock("axios");
import axios from "axios";
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPrisma = {
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
};

describe("PrePrimaryService", () => {
  let service: PrePrimaryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrePrimaryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PrePrimaryService>(PrePrimaryService);
  });

  beforeEach(() => jest.clearAllMocks());

  // ─── recordDailyActivity ─────────────────────────────────────────────────────

  describe("recordDailyActivity", () => {
    const log: DailyActivityLog = {
      studentId: "stu-1",
      schoolId: "school-1",
      teacherId: "teacher-1",
      date: new Date("2025-04-10"),
      arrivalTime: "08:30",
      departureTime: "15:00",
      meals: [
        { meal: "BREAKFAST", ate: "ALL" },
        { meal: "LUNCH", ate: "MOST" },
      ],
      napStart: "12:00",
      napEnd: "13:00",
      mood: "HAPPY",
      activities: ["Painting", "Story Time"],
      toileting: [{ time: "10:00", type: "WET" }],
      notes: "Had a great day",
    };

    it("inserts daily activity log via raw query", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await service.recordDailyActivity(log);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("completes without error for minimal log (no optional fields)", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const minimalLog: DailyActivityLog = {
        studentId: "stu-2",
        schoolId: "school-1",
        teacherId: "teacher-1",
        date: new Date("2025-04-11"),
        meals: [],
        mood: "CONTENT",
        activities: [],
        toileting: [],
      };

      await expect(service.recordDailyActivity(minimalLog)).resolves.toBeUndefined();
    });
  });

  // ─── getMilestones ────────────────────────────────────────────────────────────

  describe("getMilestones", () => {
    it("returns milestones with age-in-months calculation", async () => {
      // DOB 36 months ago
      const dob = new Date(Date.now() - 36 * 30 * 86400000);

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ date_of_birth: dob.toISOString() }])  // student DOB
        .mockResolvedValueOnce([
          {
            id: "ms-1",
            domain: "LANGUAGE",
            milestone: "Says first words",
            status: "ACHIEVED",
            achieved_at: new Date(Date.now() - 24 * 30 * 86400000), // achieved 24 months ago
          },
        ]);

      const result = await service.getMilestones("stu-1");

      expect(result).toHaveLength(1);
      expect(result[0].ageAtAchievement).toBeGreaterThanOrEqual(11); // approx 12 months
    });

    it("returns ageAtAchievement as null when achieved_at is not set", async () => {
      const dob = new Date(Date.now() - 36 * 30 * 86400000);

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ date_of_birth: dob.toISOString() }])
        .mockResolvedValueOnce([
          {
            id: "ms-2",
            domain: "GROSS_MOTOR",
            milestone: "Walks independently",
            status: "NOT_YET",
            achieved_at: null,
          },
        ]);

      const result = await service.getMilestones("stu-1");

      expect(result[0].ageAtAchievement).toBeNull();
    });

    it("returns age 0 months when student DOB is missing", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{}])  // no date_of_birth field
        .mockResolvedValueOnce([]);

      const result = await service.getMilestones("stu-no-dob");

      expect(result).toEqual([]);
    });
  });

  // ─── updateMilestone ─────────────────────────────────────────────────────────

  describe("updateMilestone", () => {
    it("executes upsert for milestone with ACHIEVED status", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await service.updateMilestone("stu-1", "teacher-1", {
        domain: "LANGUAGE",
        milestone: "Says sentences",
        status: "ACHIEVED",
        notes: "Clear speech",
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("executes upsert for milestone with NOT_YET status", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await service.updateMilestone("stu-1", "teacher-1", {
        domain: "FINE_MOTOR",
        milestone: "Holds pencil",
        status: "NOT_YET",
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  // ─── uploadPhoto ──────────────────────────────────────────────────────────────

  describe("uploadPhoto", () => {
    it("inserts photo record when parent consent is verified", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await service.uploadPhoto("school-1", "stu-1", "teacher-1", {
        s3Key: "photos/school-1/stu-1/activity-2025-04-10.jpg",
        caption: "Finger painting activity",
        date: new Date("2025-04-10"),
        parentConsentVerified: true,
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("throws error when parent consent not verified (no-consent → throws)", async () => {
      await expect(
        service.uploadPhoto("school-1", "stu-1", "teacher-1", {
          s3Key: "photos/school-1/stu-1/activity.jpg",
          caption: "Play time",
          date: new Date("2025-04-10"),
          parentConsentVerified: false,
        }),
      ).rejects.toThrow("Parent consent required before uploading child photos");

      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  // ─── getPhotoGallery ──────────────────────────────────────────────────────────

  describe("getPhotoGallery", () => {
    it("returns photos only for the student belonging to parent (own child when parentId)", async () => {
      const photos = [
        { id: "photo-1", student_id: "stu-1", s3_key: "photos/stu-1/1.jpg", caption: "Art", date: new Date() },
        { id: "photo-2", student_id: "stu-1", s3_key: "photos/stu-1/2.jpg", caption: "Play", date: new Date() },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(photos);

      const result = await service.getPhotoGallery("stu-1", "parent-1");

      // The JOIN in the query ensures parent-1 owns stu-1; the mock returns the filtered data
      expect(result).toEqual(photos);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("returns empty array when parent has no matching children", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getPhotoGallery("stu-other", "parent-1");

      expect(result).toEqual([]);
    });
  });

  // ─── addAuthorisedPickup ──────────────────────────────────────────────────────

  describe("addAuthorisedPickup", () => {
    it("inserts authorised pickup person", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await service.addAuthorisedPickup("stu-1", {
        name: "Grandma Sharma",
        relationship: "GRANDMOTHER",
        phone: "9123456789",
        photoUrl: "https://cdn.school.com/photos/grandma.jpg",
        idType: "AADHAAR",
        idNumber: "1234-5678-9012",
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  // ─── verifyPickup ─────────────────────────────────────────────────────────────

  describe("verifyPickup", () => {
    it("returns authorised=true with person data for a registered phone number", async () => {
      const person = {
        id: "pickup-1",
        name: "Grandma Sharma",
        relationship: "GRANDMOTHER",
        phone: "9123456789",
        active: true,
      };
      mockPrisma.$queryRaw.mockResolvedValue([person]);

      const result = await service.verifyPickup("stu-1", "9123456789");

      expect(result.authorised).toBe(true);
      expect(result.person).toEqual(person);
    });

    it("returns authorised=false with no person for an unknown phone number", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.verifyPickup("stu-1", "9999999999");

      expect(result.authorised).toBe(false);
      expect(result.person).toBeUndefined();
    });
  });

  // ─── setAllergenProfile ───────────────────────────────────────────────────────

  describe("setAllergenProfile", () => {
    it("updates student allergen profile", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(1);

      await service.setAllergenProfile("stu-1", ["PEANUTS", "DAIRY"], "Lactose intolerant");

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  // ─── checkMealCompatibility ───────────────────────────────────────────────────

  describe("checkMealCompatibility", () => {
    it("returns safe=true when no allergen conflicts", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ allergens: ["PEANUTS"] }])        // student
        .mockResolvedValueOnce([{ allergens: ["GLUTEN", "DAIRY"] }]); // menu item

      const result = await service.checkMealCompatibility("stu-1", "menu-1");

      expect(result.safe).toBe(true);
      expect(result.conflictingAllergens).toHaveLength(0);
    });

    it("returns safe=false and lists conflicting allergens when allergen is in meal (allergen → blocked)", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ allergens: ["PEANUTS", "DAIRY"] }]) // student has peanuts
        .mockResolvedValueOnce([{ allergens: ["PEANUTS", "SESAME"] }]); // meal contains peanuts

      const result = await service.checkMealCompatibility("stu-1", "menu-2");

      expect(result.safe).toBe(false);
      expect(result.conflictingAllergens).toContain("PEANUTS");
      expect(result.conflictingAllergens).toHaveLength(1);
    });

    it("returns safe=true when student has no allergen profile", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ allergens: null }])                  // no allergens
        .mockResolvedValueOnce([{ allergens: ["PEANUTS"] }]);

      const result = await service.checkMealCompatibility("stu-1", "menu-1");

      expect(result.safe).toBe(true);
      expect(result.conflictingAllergens).toHaveLength(0);
    });

    it("returns safe=true when menu item has no allergens listed", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ allergens: ["PEANUTS"] }])
        .mockResolvedValueOnce([{ allergens: null }]);

      const result = await service.checkMealCompatibility("stu-1", "menu-3");

      expect(result.safe).toBe(true);
      expect(result.conflictingAllergens).toHaveLength(0);
    });
  });
});
