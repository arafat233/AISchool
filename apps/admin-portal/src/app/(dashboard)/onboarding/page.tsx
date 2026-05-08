"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  CheckCircle2,
  Circle,
  Loader2,
  ChevronRight,
  School,
  BookOpen,
  Award,
  DollarSign,
  Users,
  GraduationCap,
  PlayCircle,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const STEP_META: Record<
  string,
  { label: string; description: string; icon: React.ElementType }
> = {
  school_profile: {
    label: "School Profile",
    description: "Set up school name, address, logo, and contact details.",
    icon: School,
  },
  academic_structure: {
    label: "Academic Structure",
    description: "Define classes, sections, and subjects.",
    icon: BookOpen,
  },
  grading_scale: {
    label: "Grading Scale",
    description: "Configure grade boundaries and GPA mapping.",
    icon: Award,
  },
  fee_structure: {
    label: "Fee Structure",
    description: "Add fee heads, amounts, and due dates.",
    icon: DollarSign,
  },
  staff_import: {
    label: "Staff Import",
    description: "Bulk import staff members via CSV.",
    icon: Users,
  },
  student_import: {
    label: "Student Import",
    description: "Bulk import students via CSV.",
    icon: GraduationCap,
  },
  training: {
    label: "Training",
    description: "Complete the admin video walkthrough.",
    icon: PlayCircle,
  },
  go_live: {
    label: "Go Live",
    description: "Final sign-off — activates your tenant.",
    icon: Rocket,
  },
};

interface StepData {
  completed: boolean;
  completedAt: string | null;
  data?: Record<string, any>;
}

interface Checklist {
  id: string;
  tenantId: string;
  currentStep: string;
  completedAt: string | null;
  steps: Record<string, StepData>;
  completedCount: number;
  totalSteps: number;
  percentComplete: number;
  nextStep: string | null;
}

function useChecklist(tenantId: string) {
  return useQuery<Checklist>({
    queryKey: ["onboarding", tenantId],
    queryFn: () => api.get(`/onboarding/${tenantId}`).then((r) => r.data),
    enabled: !!tenantId,
  });
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
      <div
        className="h-2.5 rounded-full bg-primary transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function StepCard({
  stepKey,
  stepData,
  isCurrent,
  onComplete,
  isPending,
}: {
  stepKey: string;
  stepData: StepData | undefined;
  isCurrent: boolean;
  onComplete: () => void;
  isPending: boolean;
}) {
  const meta = STEP_META[stepKey];
  const Icon = meta?.icon ?? Circle;
  const completed = stepData?.completed ?? false;

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-xl border transition-all",
        completed
          ? "bg-green-500/5 border-green-500/20"
          : isCurrent
          ? "bg-primary/5 border-primary/30 shadow-sm"
          : "bg-card border-border opacity-60"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
          completed
            ? "bg-green-500/15 text-green-600"
            : isCurrent
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {completed ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm">{meta?.label ?? stepKey}</p>
          {completed && stepData?.completedAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(stepData.completedAt).toLocaleDateString("en-IN")}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{meta?.description}</p>

        {isCurrent && !completed && (
          <button
            onClick={onComplete}
            disabled={isPending}
            className="mt-3 inline-flex items-center gap-2 text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            Mark Complete
          </button>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId ?? "";
  const qc = useQueryClient();

  const { data: checklist, isLoading } = useChecklist(tenantId);

  const [completingStep, setCompletingStep] = useState<string | null>(null);

  const completeStep = useMutation({
    mutationFn: (step: string) =>
      api
        .post(`/onboarding/${tenantId}/complete`, { step })
        .then((r) => r.data),
    onMutate: (step) => setCompletingStep(step),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["onboarding", tenantId] });
      if (data.goLive) {
        toast.success("🎉 Your school is now LIVE!");
      } else {
        toast.success("Step completed!");
      }
    },
    onError: () => toast.error("Failed to complete step"),
    onSettled: () => setCompletingStep(null),
  });

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No tenant associated with your account.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!checklist) return null;

  const steps = Object.entries(STEP_META);
  const isComplete = !!checklist.completedAt;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">School Onboarding</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Complete all 8 steps to activate your school on AISchool.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {checklist.completedCount} / {checklist.totalSteps} steps completed
          </span>
          <span className="text-sm font-bold text-primary">
            {checklist.percentComplete}%
          </span>
        </div>
        <ProgressBar percent={checklist.percentComplete} />

        {isComplete ? (
          <div className="flex items-center gap-2 text-green-600 text-sm font-semibold pt-1">
            <CheckCircle2 className="w-4 h-4" />
            Onboarding complete — your school is live!
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Next:{" "}
            <span className="font-medium text-foreground">
              {STEP_META[checklist.nextStep ?? ""]?.label ?? "—"}
            </span>
          </p>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map(([key]) => (
          <StepCard
            key={key}
            stepKey={key}
            stepData={checklist.steps[key]}
            isCurrent={checklist.currentStep === key && !isComplete}
            onComplete={() => completeStep.mutate(key)}
            isPending={completingStep === key && completeStep.isPending}
          />
        ))}
      </div>
    </div>
  );
}
