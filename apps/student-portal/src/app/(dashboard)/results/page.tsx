"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Trophy,
  ChevronDown,
  Download,
  Loader2,
  AlertTriangle,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";

type PassFail = "PASS" | "FAIL";

interface SubjectResult {
  subject: string;
  marksObtained: number;
  totalMarks: number;
  grade: string;
  passOrFail: PassFail;
}

interface ExamResult {
  id: string;
  examName: string;
  examType: string;
  academicYear: string;
  conductedOn: string;
  percentage: number;
  overallGrade: string;
  passOrFail: PassFail;
  subjects: SubjectResult[];
}

const GRADE_COLORS: Record<string, string> = {
  "A+": "text-green-700 dark:text-green-400 bg-green-500/10 border-green-500/20",
  "A":  "text-green-700 dark:text-green-400 bg-green-500/10 border-green-500/20",
  "B+": "text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  "B":  "text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  "C":  "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  "D":  "text-orange-700 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
  "F":  "text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/20",
};

function gradeClass(grade: string) {
  return GRADE_COLORS[grade] ?? "text-muted-foreground bg-muted border-border";
}

async function downloadReportCard(studentId: string, examId: string) {
  try {
    const response = await fetch(`/api/exams/report-cards?studentId=${studentId}&examId=${examId}`);
    if (!response.ok) throw new Error("Failed");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-card-${examId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    toast.error("Failed to download report card");
  }
}

export default function ResultsPage() {
  const user = useAuthStore((s) => s.user);
  const studentId = user?.id ?? "";
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: results = [], isLoading, isError } = useQuery<ExamResult[]>({
    queryKey: ["exam-results", studentId],
    queryFn: () => fetch("/api/exams/results/student").then((r) => r.json()),
    enabled: !!studentId,
    placeholderData: [
      {
        id: "ex1",
        examName: "Mid-Term Examination",
        examType: "MID_TERM",
        academicYear: "2025-26",
        conductedOn: "2026-03-15",
        percentage: 84.5,
        overallGrade: "A",
        passOrFail: "PASS",
        subjects: [
          { subject: "Mathematics",  marksObtained: 88, totalMarks: 100, grade: "A+", passOrFail: "PASS" },
          { subject: "Physics",      marksObtained: 78, totalMarks: 100, grade: "B+", passOrFail: "PASS" },
          { subject: "Chemistry",    marksObtained: 82, totalMarks: 100, grade: "A",  passOrFail: "PASS" },
          { subject: "English",      marksObtained: 90, totalMarks: 100, grade: "A+", passOrFail: "PASS" },
          { subject: "History",      marksObtained: 85, totalMarks: 100, grade: "A",  passOrFail: "PASS" },
        ],
      },
      {
        id: "ex2",
        examName: "Unit Test 1",
        examType: "UNIT_TEST",
        academicYear: "2025-26",
        conductedOn: "2026-01-20",
        percentage: 76,
        overallGrade: "B+",
        passOrFail: "PASS",
        subjects: [
          { subject: "Mathematics",  marksObtained: 36, totalMarks: 50, grade: "B+", passOrFail: "PASS" },
          { subject: "Physics",      marksObtained: 40, totalMarks: 50, grade: "A",  passOrFail: "PASS" },
          { subject: "Chemistry",    marksObtained: 38, totalMarks: 50, grade: "A",  passOrFail: "PASS" },
          { subject: "English",      marksObtained: 42, totalMarks: 50, grade: "A+", passOrFail: "PASS" },
          { subject: "History",      marksObtained: 34, totalMarks: 50, grade: "B",  passOrFail: "PASS" },
        ],
      },
    ],
  });

  const best = results.reduce((b, r) => (r.percentage > (b?.percentage ?? 0) ? r : b), results[0] ?? null);

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
        <p className="text-sm">Failed to load results</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border py-20 flex flex-col items-center text-muted-foreground gap-3">
        <BookOpen className="w-8 h-8 opacity-20" />
        <p className="text-sm">No exam results available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="bg-card rounded-xl border border-border grid grid-cols-3 divide-x divide-border">
        <div className="p-5 flex items-start gap-3">
          <Trophy className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Best Performance</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{best?.percentage.toFixed(1)}%</p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Exams Taken</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{results.length}</p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Average</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">
              {(results.reduce((s, r) => s + r.percentage, 0) / results.length).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Results list */}
      <div className="space-y-3">
        {results.map((exam) => {
          const isExpanded = expanded === exam.id;
          return (
            <div key={exam.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : exam.id)}
                className="w-full flex items-start gap-4 px-5 py-4 hover:bg-muted/40 transition text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{exam.examName}</span>
                    <span
                      className={cn(
                        "inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-md border",
                        gradeClass(exam.overallGrade)
                      )}
                    >
                      {exam.overallGrade}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border",
                        exam.passOrFail === "PASS"
                          ? "text-green-700 dark:text-green-400 bg-green-500/10 border-green-500/20"
                          : "text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/20"
                      )}
                    >
                      {exam.passOrFail}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {exam.academicYear} · {exam.examType.replace(/_/g, " ")} · {new Date(exam.conductedOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums text-foreground">{exam.percentage.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">{exam.subjects.length} subjects</p>
                  </div>
                  <ChevronDown
                    className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        {["Subject", "Marks", "Grade", "Result"].map((h) => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {exam.subjects.map((sub) => (
                        <tr key={sub.subject} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{sub.subject}</td>
                          <td className="px-4 py-3 tabular-nums text-foreground">
                            {sub.marksObtained}
                            <span className="text-muted-foreground">/{sub.totalMarks}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({((sub.marksObtained / sub.totalMarks) * 100).toFixed(0)}%)
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md border", gradeClass(sub.grade))}>
                              {sub.grade}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                sub.passOrFail === "PASS" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              )}
                            >
                              {sub.passOrFail}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 flex justify-end">
                    <button
                      onClick={() => downloadReportCard(studentId, exam.id)}
                      className="btn-secondary flex items-center gap-2 text-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Report Card
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
