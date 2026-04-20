import { Test, TestingModule } from "@nestjs/testing";
import { OnboardingService } from "./onboarding.service";
import { NotFoundException } from "@nestjs/common";

const STEPS = [
  "school_profile", "academic_structure", "grading_scale", "fee_structure",
  "staff_import", "student_import", "training", "go_live",
] as const;

const emptySteps = STEPS.reduce((acc, s) => ({ ...acc, [s]: { completed: false, completedAt: null } }), {});
const twoCompleted = {
  ...emptySteps,
  school_profile: { completed: true, completedAt: "2026-04-01" },
  academic_structure: { completed: true, completedAt: "2026-04-02" },
};

const mockPrisma = {
  onboardingChecklist: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
};

describe("OnboardingService", () => {
  let service: OnboardingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OnboardingService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<OnboardingService>(OnboardingService);
  });

  describe("getChecklist", () => {
    it("should create new checklist when none exists and return 0% progress", async () => {
      mockPrisma.onboardingChecklist.findFirst.mockResolvedValueOnce(null);
      mockPrisma.onboardingChecklist.create.mockResolvedValueOnce({
        tenantId: "t-1", steps: emptySteps, currentStep: "school_profile",
      });
      const result = await service.getChecklist("t-1");
      expect(result.percentComplete).toBe(0);
      expect(result.completedCount).toBe(0);
      expect(result.nextStep).toBe("school_profile");
    });

    it("should compute correct progress when 2 of 8 steps completed", async () => {
      mockPrisma.onboardingChecklist.findFirst.mockResolvedValueOnce({
        tenantId: "t-1", steps: twoCompleted, currentStep: "grading_scale",
      });
      const result = await service.getChecklist("t-1");
      expect(result.completedCount).toBe(2);
      expect(result.percentComplete).toBe(25); // 2/8 = 25%
      expect(result.nextStep).toBe("grading_scale");
    });

    it("should return null nextStep when all steps are complete", async () => {
      const allCompleted = STEPS.reduce((acc, s) => ({ ...acc, [s]: { completed: true } }), {});
      mockPrisma.onboardingChecklist.findFirst.mockResolvedValueOnce({
        tenantId: "t-1", steps: allCompleted, currentStep: "go_live",
      });
      const result = await service.getChecklist("t-1");
      expect(result.nextStep).toBeNull();
      expect(result.percentComplete).toBe(100);
    });
  });

  describe("completeStep", () => {
    it("should throw NotFoundException when checklist does not exist", async () => {
      mockPrisma.onboardingChecklist.findFirst.mockResolvedValueOnce(null);
      await expect(service.completeStep("t-1", "school_profile")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should mark step as completed and advance currentStep", async () => {
      mockPrisma.onboardingChecklist.findFirst.mockResolvedValueOnce({
        tenantId: "t-1", steps: emptySteps, currentStep: "school_profile",
      });
      mockPrisma.onboardingChecklist.update.mockResolvedValueOnce({
        steps: { ...emptySteps, school_profile: { completed: true } },
        currentStep: "academic_structure",
      });
      await service.completeStep("t-1", "school_profile");
      expect(mockPrisma.onboardingChecklist.update).toHaveBeenCalled();
    });
  });
});
