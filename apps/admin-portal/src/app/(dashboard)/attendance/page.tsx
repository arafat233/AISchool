"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle, ClipboardList } from "lucide-react";

interface Section { id: string; name: string; gradeLevel?: { name: string } }

interface ClassSummary {
  sectionId: string;
  sectionName: string;
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

interface BelowThreshold {
  studentId: string;
  studentName: string;
  admissionNo: string;
  sectionName: string;
  presentDays: number;
  totalDays: number;
  percentage: number;
}

type Tab = "daily" | "low-attendance";

const TAB_LABELS: Record<Tab, string> = {
  "daily": "Daily Overview",
  "low-attendance": "Low Attendance",
};

export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>("daily");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedSection, setSelectedSection] = useState("");

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["sections"],
    queryFn: () => api.get("/academic/sections").then((r) => r.data),
    placeholderData: [],
  });

  const { data: classSummary = [], isLoading: loadingClass } = useQuery<ClassSummary[]>({
    queryKey: ["attendance-class-summary", date],
    queryFn: () => api.get("/attendance/class-summary", { params: { date } }).then((r) => r.data),
    placeholderData: [],
    enabled: tab === "daily",
  });

  const { data: belowThreshold = [], isLoading: loadingBelow } = useQuery<BelowThreshold[]>({
    queryKey: ["attendance-below-threshold", selectedSection],
    queryFn: () =>
      api.get("/attendance/below-threshold", { params: { sectionId: selectedSection || undefined, threshold: 75 } }).then((r) => r.data),
    placeholderData: [],
    enabled: tab === "low-attendance",
  });

  return (
    <div className="space-y-4">
      {/* Underline tabs */}
      <div className="flex border-b border-border">
        {(["daily", "low-attendance"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              tab === t
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Daily overview */}
      {tab === "daily" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Select date"
              className="input max-w-xs"
            />
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Class / Section", "Total", "Present", "Absent", "Late", "Attendance %"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingClass ? (
                  <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : classSummary.length === 0 ? (
                  <tr><td colSpan={6} className="py-20 text-center text-muted-foreground">
                    <ClipboardList className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No attendance data for {formatDate(date)}</p>
                  </td></tr>
                ) : classSummary.map((row) => (
                  <tr key={row.sectionId} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{row.sectionName}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{row.total}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-green-700 dark:text-green-400">{row.present}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-destructive">{row.absent}</td>
                    <td className="px-4 py-3 tabular-nums text-amber-600 dark:text-amber-400">{row.late}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", row.percentage >= 75 ? "bg-green-500" : "bg-destructive")}
                            style={{ width: `${row.percentage}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-xs font-semibold tabular-nums",
                          row.percentage >= 75 ? "text-green-700 dark:text-green-400" : "text-destructive"
                        )}>
                          {row.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low attendance */}
      {tab === "low-attendance" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              aria-label="Filter by section"
              className="input max-w-xs"
            >
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.gradeLevel?.name} - Section {s.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Students below 75% attendance
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Student", "Admission No", "Class", "Present / Total", "Attendance %"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingBelow ? (
                  <tr><td colSpan={5} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : belowThreshold.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-muted-foreground">
                    <p className="text-sm">All students are above 75% — great!</p>
                  </td></tr>
                ) : belowThreshold.map((row) => (
                  <tr key={row.studentId} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{row.studentName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.admissionNo}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.sectionName}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{row.presentDays}/{row.totalDays}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold bg-destructive/10 text-destructive tabular-nums">
                        {row.percentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
