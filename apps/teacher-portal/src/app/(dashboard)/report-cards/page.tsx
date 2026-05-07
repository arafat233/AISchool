"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Loader2,
  FileText,
  Download,
  ChevronDown,
  Award,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  name: string;
  gradeLevel?: { name: string };
}

interface ReportCard {
  studentId: string;
  studentName: string;
  rollNo: string;
  examId: string;
  examName: string;
  overallGrade: string;
  percentage: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function gradeColor(grade: string): string {
  const g = grade.toUpperCase();
  if (g === "A+" || g === "A") return "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20";
  if (g === "B+" || g === "B") return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20";
  if (g === "C+" || g === "C") return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
  return "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ReportCardsPage() {
  const userId = useAuthStore((s) => s.user?.id) ?? "";
  const [selectedSection, setSelectedSection] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  // Teacher sections
  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["my-sections"],
    queryFn: () => api.get("/teacher/sections").then((r) => r.data),
    enabled: !!userId,
  });

  // Report cards for selected section
  const {
    data: reportCards = [],
    isLoading,
    isError,
  } = useQuery<ReportCard[]>({
    queryKey: ["report-cards", selectedSection],
    queryFn: () =>
      api
        .get(`/exams/report-cards/section/${selectedSection}`)
        .then((r) => r.data),
    enabled: !!selectedSection,
  });

  async function handleDownload(studentId: string, examId: string, studentName: string) {
    const key = `${studentId}-${examId}`;
    setDownloading(key);
    try {
      const response = await api.get(
        `/exams/report-cards/${studentId}/${examId}/pdf`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `report-card-${studentName.replace(/\s+/g, "-")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded report card for ${studentName}`);
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Report Cards</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          View and download published report cards for your sections
        </p>
      </div>

      {/* Section selector */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            aria-label="Select class section"
            className="input min-w-[220px] appearance-none pr-8"
          >
            <option value="">Select a section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.gradeLevel?.name} — Section {s.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Content */}
      {!selectedSection ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground font-medium">
            Select a section to view report cards
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-sm text-red-700 dark:text-red-400 text-center">
          Failed to load report cards. Please try refreshing.
        </div>
      ) : reportCards.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <Award className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground font-medium">
            No published report cards for this section
          </p>
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Exam
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Grade
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Percentage
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {reportCards.map((card) => {
                const dlKey = `${card.studentId}-${card.examId}`;
                return (
                  <tr
                    key={dlKey}
                    className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {card.rollNo}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {card.studentName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {card.examName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${gradeColor(
                          card.overallGrade
                        )}`}
                      >
                        {card.overallGrade}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5 min-w-[60px]">
                          <div
                            className="bg-primary h-1.5 rounded-full"
                            style={{ width: `${card.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {card.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          handleDownload(
                            card.studentId,
                            card.examId,
                            card.studentName
                          )
                        }
                        disabled={downloading === dlKey}
                        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none disabled:opacity-50"
                      >
                        {downloading === dlKey ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-muted/30 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {reportCards.length} report card{reportCards.length !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
