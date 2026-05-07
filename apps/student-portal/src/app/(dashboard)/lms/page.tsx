"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronDown,
  Loader2,
  AlertTriangle,
  PlayCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";

interface Lesson {
  id: string;
  title: string;
  duration?: string;
  completed: boolean;
}

interface Course {
  id: string;
  title: string;
  subject: string;
  teacher: string;
  completedLessons: number;
  totalLessons: number;
  lessons: Lesson[];
}

export default function LmsPage() {
  const user = useAuthStore((s) => s.user);
  const studentId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: courses = [], isLoading, isError } = useQuery<Course[]>({
    queryKey: ["lms-enrollments", studentId],
    queryFn: () => api.get(`/lms/enrollments/${studentId}`).then((r) => r.data),
    enabled: !!studentId,
    placeholderData: [
      {
        id: "c1",
        title: "Advanced Calculus",
        subject: "Mathematics",
        teacher: "Mr. Sharma",
        completedLessons: 8,
        totalLessons: 15,
        lessons: [
          { id: "l1", title: "Limits and Continuity",      completed: true  },
          { id: "l2", title: "Derivatives — Introduction", completed: true  },
          { id: "l3", title: "Chain Rule",                 completed: true  },
          { id: "l4", title: "Product & Quotient Rule",    completed: true  },
          { id: "l5", title: "Integration Basics",         completed: true  },
          { id: "l6", title: "Definite Integrals",         completed: true  },
          { id: "l7", title: "Integration by Parts",       completed: true  },
          { id: "l8", title: "Partial Fractions",          completed: true  },
          { id: "l9", title: "Differential Equations",     completed: false },
          { id: "l10", title: "Series & Sequences",        completed: false, duration: "45 min" },
        ],
      },
      {
        id: "c2",
        title: "Mechanics & Thermodynamics",
        subject: "Physics",
        teacher: "Ms. Patel",
        completedLessons: 5,
        totalLessons: 12,
        lessons: [
          { id: "l11", title: "Newton's Laws",          completed: true  },
          { id: "l12", title: "Work and Energy",        completed: true  },
          { id: "l13", title: "Momentum",               completed: true  },
          { id: "l14", title: "Rotational Motion",      completed: true  },
          { id: "l15", title: "Gravitation",            completed: true  },
          { id: "l16", title: "Thermodynamics Intro",   completed: false },
          { id: "l17", title: "Heat Transfer",          completed: false },
        ],
      },
      {
        id: "c3",
        title: "Organic Chemistry",
        subject: "Chemistry",
        teacher: "Dr. Khan",
        completedLessons: 0,
        totalLessons: 10,
        lessons: [
          { id: "l18", title: "Hydrocarbons",   completed: false },
          { id: "l19", title: "Alcohols",       completed: false },
          { id: "l20", title: "Aldehydes",      completed: false },
        ],
      },
    ],
  });

  const markComplete = useMutation({
    mutationFn: (lessonId: string) =>
      api.post(`/lms/lessons/${lessonId}/complete`).then((r) => r.data),
    onSuccess: () => {
      toast.success("Lesson marked as complete");
      queryClient.invalidateQueries({ queryKey: ["lms-enrollments", studentId] });
    },
    onError: () => toast.error("Failed to update lesson"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
        <AlertTriangle className="w-8 h-8 opacity-40" />
        <p className="text-sm">Failed to load courses</p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border py-20 flex flex-col items-center text-muted-foreground gap-3">
        <BookOpen className="w-8 h-8 opacity-20" />
        <p className="text-sm">No enrolled courses found</p>
      </div>
    );
  }

  const totalCompleted = courses.reduce((s, c) => s + c.completedLessons, 0);
  const totalLessons = courses.reduce((s, c) => s + c.totalLessons, 0);
  const overallPct = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="bg-card rounded-xl border border-border grid grid-cols-3 divide-x divide-border">
        <div className="p-5 flex items-start gap-3">
          <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Enrolled Courses</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{courses.length}</p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Lessons Completed</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{totalCompleted}/{totalLessons}</p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <PlayCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Overall Progress</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{overallPct}%</p>
          </div>
        </div>
      </div>

      {/* Course list */}
      <div className="space-y-3">
        {courses.map((course) => {
          const pct = course.totalLessons > 0
            ? Math.round((course.completedLessons / course.totalLessons) * 100)
            : 0;
          const isExpanded = expanded === course.id;

          return (
            <div key={course.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : course.id)}
                className="w-full flex items-start gap-4 px-5 py-4 hover:bg-muted/40 transition text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {course.subject}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground">{course.title}</p>
                  <p className="text-xs text-muted-foreground">{course.teacher}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          pct === 100 ? "bg-green-500" : "bg-primary"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                      {course.completedLessons}/{course.totalLessons} lessons ({pct}%)
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={cn("w-4 h-4 text-muted-foreground mt-1 transition-transform shrink-0", isExpanded && "rotate-180")}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-border">
                  {course.lessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/30",
                        idx !== 0 && "border-t border-border/50"
                      )}
                    >
                      {lesson.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <span className={cn("flex-1", lesson.completed ? "text-muted-foreground line-through" : "text-foreground")}>
                        {lesson.title}
                      </span>
                      {lesson.duration && (
                        <span className="text-xs text-muted-foreground shrink-0">{lesson.duration}</span>
                      )}
                      {!lesson.completed && (
                        <button
                          onClick={() => markComplete.mutate(lesson.id)}
                          disabled={markComplete.isPending}
                          className="text-xs text-primary hover:text-primary/80 font-medium transition disabled:opacity-50 shrink-0"
                        >
                          {markComplete.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Mark done"
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
