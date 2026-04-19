import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";

/**
 * Onboarding wizard — 8 steps for a new school going live:
 *  1. school_profile      — Basic info (name, address, contact, logo)
 *  2. academic_structure  — Classes, sections, subjects
 *  3. grading_scale       — Grade definitions
 *  4. fee_structure       — Fee types and amounts
 *  5. staff_import        — Bulk import staff via CSV
 *  6. student_import      — Bulk import students via CSV
 *  7. training            — Video walkthrough completion
 *  8. go_live             — Final checklist sign-off
 */
const STEPS = [
  "school_profile",
  "academic_structure",
  "grading_scale",
  "fee_structure",
  "staff_import",
  "student_import",
  "training",
  "go_live",
] as const;

type Step = typeof STEPS[number];

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getChecklist(tenantId: string) {
    let checklist = await this.prisma.onboardingChecklist.findFirst({ where: { tenantId } });
    if (!checklist) {
      checklist = await this.prisma.onboardingChecklist.create({
        data: {
          tenantId,
          steps: STEPS.reduce((acc, s) => ({ ...acc, [s]: { completed: false, completedAt: null } }), {}),
          currentStep: STEPS[0],
          completedAt: null,
        },
      });
    }
    const steps = checklist.steps as Record<string, any>;
    const completedCount = Object.values(steps).filter((s) => s.completed).length;
    return {
      ...checklist,
      completedCount,
      totalSteps: STEPS.length,
      percentComplete: Math.round((completedCount / STEPS.length) * 100),
      nextStep: STEPS.find((s) => !steps[s]?.completed) ?? null,
    };
  }

  async completeStep(tenantId: string, step: Step, data?: Record<string, any>) {
    const checklist = await this.prisma.onboardingChecklist.findFirst({ where: { tenantId } });
    if (!checklist) throw new NotFoundException(`No onboarding checklist for tenant ${tenantId}`);

    const steps = checklist.steps as Record<string, any>;
    steps[step] = { completed: true, completedAt: new Date().toISOString(), data };

    const nextStep = STEPS.find((s) => !steps[s]?.completed) ?? null;
    const allDone = STEPS.every((s) => steps[s]?.completed);

    const updated = await this.prisma.onboardingChecklist.update({
      where: { id: checklist.id },
      data: {
        steps,
        currentStep: nextStep ?? "complete",
        ...(allDone ? { completedAt: new Date() } : {}),
      },
    });

    // On go_live completion — activate tenant
    if (step === "go_live" && allDone) {
      await this.prisma.tenant.update({ where: { id: tenantId }, data: { status: "ACTIVE" } });
    }

    const completedCount = Object.values(steps).filter((s) => s.completed).length;
    return {
      ...updated,
      completedCount,
      totalSteps: STEPS.length,
      percentComplete: Math.round((completedCount / STEPS.length) * 100),
      nextStep,
      goLive: allDone,
    };
  }

  getSteps() { return STEPS; }
}
