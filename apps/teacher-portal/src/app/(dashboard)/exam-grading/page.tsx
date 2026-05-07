"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Loader2,
  ClipboardCheck,
  ChevronLeft,
  Save,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PendingExam {
  id: string;
  name: string;
  subjectName: string;
  sectionName: string;
  totalStudents: number;
  gradedCount: number;
  maxMarks: number;
  examDate: string;
}

interface ExamResult {
  resultId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  marksObtained: number | null;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ExamGradingPage() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id) ?? "";

  const [selectedExam, setSelectedExam] = useState<PendingExam | null>(null);
  const [marksMap, setMarksMap] = useState<Record<string, string>>({});

  // List of pending-grading exams
  const {
    data: exams = [],
    isLoading,
    isError,
  } = useQuery<PendingExam[]>({
    queryKey: ["pending-grading", userId],
    queryFn: () =>
      api
        .get(`/exams/teacher/${userId}/pending-grading`)
        .then((r) => r.data),
    enabled: !!userId,
  });

  // Results for selected exam
  const {
    data: results = [],
    isLoading: loadingResults,
  } = useQuery<ExamResult[]>({
    queryKey: ["exam-results", selectedExam?.id],
    queryFn: () =>
      api.get(`/exams/${selectedExam!.id}/results`).then((r) => r.data),
    enabled: !!selectedExam,
    placeholderData: selectedExam
      ? Array.from({ length: selectedExam.totalStudents }, (_, i) => ({
          resultId: `r${i}`,
          studentId: `s${i}`,
          studentName: `Student ${i + 1}`,
          rollNo: String(i + 1).padStart(2, "0"),
          marksObtained: null,
        }))
      : [],
  });

  // Sync results into marksMap when results load
  const initMarks = (res: ExamResult[]) => {
    const map: Record<string, string> = {};
    res.forEach((r) => {
      map[r.resultId] = r.marksObtained != null ? String(r.marksObtained) : "";
    });
    setMarksMap(map);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: { resultId: string; marksObtained: number }[]) =>
      Promise.all(
        payload.map(({ resultId, marksObtained }) =>
          api.patch(`/exams/results/${resultId}`, { marksObtained })
        )
      ),
    onSuccess: () => {
      toast.success("Marks saved successfully!");
      qc.invalidateQueries({ queryKey: ["pending-grading", userId] });
      qc.invalidateQueries({ queryKey: ["exam-results", selectedExam?.id] });
    },
    onError: () => toast.error("Failed to save marks"),
  });

  function handleSave() {
    const payload = results
      .filter((r) => marksMap[r.resultId] !== "")
      .map((r) => ({
        resultId: r.resultId,
        marksObtained: Number(marksMap[r.resultId]),
      }))
      .filter((p) => !isNaN(p.marksObtained));

    if (!payload.length) {
      toast.error("No marks to save");
      return;
    }
    saveMutation.mutate(payload);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (selectedExam) {
    return (
      <div className="space-y-6">
        {/* Back header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedExam(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Exams
          </button>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {selectedExam.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {selectedExam.subjectName} · {selectedExam.sectionName} · Max:{" "}
            {selectedExam.maxMarks} marks
          </p>
        </div>

        {loadingResults ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest w-12">
                    Roll
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Student
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest w-40">
                    Marks / {selectedExam.maxMarks}
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => (
                  <tr
                    key={result.resultId}
                    className={`border-b border-border/50 transition-colors ${
                      idx % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {result.rollNo}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {result.studentName}
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        max={selectedExam.maxMarks}
                        value={marksMap[result.resultId] ?? ""}
                        onChange={(e) =>
                          setMarksMap((m) => ({
                            ...m,
                            [result.resultId]: e.target.value,
                          }))
                        }
                        placeholder="—"
                        className="input w-24 text-right tabular-nums"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Save bar */}
            <div className="px-4 py-3 bg-muted/30 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {results.length} students · Enter marks out of{" "}
                {selectedExam.maxMarks}
              </p>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Marks
              </button>
            </div>
          </div>
        )}

        {saveMutation.isSuccess && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Marks saved successfully!
          </div>
        )}
      </div>
    );
  }

  // ── Exam list ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Exam Grading</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Exams pending your marks entry
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-sm text-red-700 dark:text-red-400 text-center">
          Failed to load exams. Please try refreshing.
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground font-medium">
            All caught up!
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            No exams are pending grading at this time.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Exam
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Subject
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Section
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Progress
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Date
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => {
                const pct =
                  exam.totalStudents > 0
                    ? Math.round((exam.gradedCount / exam.totalStudents) * 100)
                    : 0;
                return (
                  <tr
                    key={exam.id}
                    className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {exam.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {exam.subjectName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {exam.sectionName}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5 min-w-[60px]">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {exam.gradedCount}/{exam.totalStudents}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(exam.examDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedExam(exam);
                          initMarks([]);
                        }}
                        className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none"
                      >
                        Grade
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
