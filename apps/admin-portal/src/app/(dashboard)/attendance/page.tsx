"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
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
    queryFn: () =>
      api.get("/attendance/class-summary", { params: { date } }).then((r) => r.data),
    placeholderData: [],
    enabled: tab === "daily",
  });

  const { data: belowThreshold = [], isLoading: loadingBelow } = useQuery<BelowThreshold[]>({
    queryKey: ["attendance-below-threshold", selectedSection],
    queryFn: () =>
      api
        .get("/attendance/below-threshold", {
          params: { sectionId: selectedSection || undefined, threshold: 75 },
        })
        .then((r) => r.data),
    placeholderData: [],
    enabled: tab === "low-attendance",
  });

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(["daily", "low-attendance"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "daily" ? "Daily Overview" : "Low Attendance"}
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
              className="input max-w-xs"
            />
          </div>
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  {["Class / Section", "Total", "Present", "Absent", "Late", "Attendance %"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingClass ? (
                  <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : classSummary.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">
                    <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    <p>No attendance data for {formatDate(date)}</p>
                  </td></tr>
                ) : classSummary.map((row) => (
                  <tr key={row.sectionId} className="border-b border-border/50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium">{row.sectionName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.total}</td>
                    <td className="px-4 py-3 text-green-700 font-medium">{row.present}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">{row.absent}</td>
                    <td className="px-4 py-3 text-amber-600">{row.late}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${row.percentage >= 75 ? "bg-green-500" : "bg-red-500"}`}
                            style={{ width: `${row.percentage}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold ${row.percentage >= 75 ? "text-green-700" : "text-red-600"}`}>
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
          <div className="flex items-center gap-3">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="input max-w-xs"
            >
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.gradeLevel?.name} - Section {s.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              Students below 75% attendance
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  {["Student", "Admission No", "Class", "Present/Total", "Attendance %"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingBelow ? (
                  <tr><td colSpan={5} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : belowThreshold.length === 0 ? (
                  <tr><td colSpan={5} className="py-16 text-center text-muted-foreground">
                    <p>All students are above 75% — great!</p>
                  </td></tr>
                ) : belowThreshold.map((row) => (
                  <tr key={row.studentId} className="border-b border-border/50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium">{row.studentName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.admissionNo}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.sectionName}</td>
                    <td className="px-4 py-3">{row.presentDays}/{row.totalDays}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
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
