"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HOLIDAY" | "WEEKEND";

interface AttendanceRecord {
  date: string;
  status: AttendanceStatus;
  remark?: string;
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; cls: string; dot: string }> = {
  PRESENT: { label: "Present", cls: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20", dot: "bg-green-500" },
  ABSENT:  { label: "Absent",  cls: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",         dot: "bg-red-500"   },
  LATE:    { label: "Late",    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",  dot: "bg-amber-500" },
  HOLIDAY: { label: "Holiday", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",     dot: "bg-blue-500"  },
  WEEKEND: { label: "Weekend", cls: "bg-muted text-muted-foreground border-transparent",                       dot: "bg-muted-foreground/30" },
};

function buildCalendarDays(year: number, month: number, records: AttendanceRecord[]) {
  const map = new Map(records.map((r) => [r.date, r]));
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = Array.from({ length: firstDay }, (_, i) => ({ key: `b${i}`, blank: true }));
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dow = new Date(year, month, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const rec = map.get(dateStr);
    return { key: dateStr, blank: false, d, dateStr, rec, isWeekend };
  });
  return [...blanks, ...days];
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);
  const studentId = user?.id ?? "";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [showLeave, setShowLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ fromDate: "", toDate: "", reason: "" });

  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const toDate = new Date(year, month + 1, 0);
  const to = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, "0")}-${String(toDate.getDate()).padStart(2, "0")}`;

  const { data: records = [], isLoading, isError } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance", studentId, from, to],
    queryFn: () =>
      api.get(`/attendance/student/${studentId}`, { params: { from, to } }).then((r) => r.data),
    enabled: !!studentId,
    placeholderData: [
      { date: `${year}-${String(month + 1).padStart(2, "0")}-01`, status: "PRESENT" },
      { date: `${year}-${String(month + 1).padStart(2, "0")}-02`, status: "PRESENT" },
      { date: `${year}-${String(month + 1).padStart(2, "0")}-03`, status: "ABSENT", remark: "Sick leave" },
      { date: `${year}-${String(month + 1).padStart(2, "0")}-06`, status: "PRESENT" },
      { date: `${year}-${String(month + 1).padStart(2, "0")}-07`, status: "LATE", remark: "Traffic delay" },
      { date: `${year}-${String(month + 1).padStart(2, "0")}-08`, status: "PRESENT" },
      { date: `${year}-${String(month + 1).padStart(2, "0")}-09`, status: "PRESENT" },
      { date: `${year}-${String(month + 1).padStart(2, "0")}-10`, status: "HOLIDAY", remark: "Public Holiday" },
      { date: `${year}-${String(month + 1).padStart(2, "0")}-13`, status: "PRESENT" },
      { date: `${year}-${String(month + 1).padStart(2, "0")}-14`, status: "PRESENT" },
      { date: `${year}-${String(month + 1).padStart(2, "0")}-15`, status: "PRESENT" },
      { date: `${year}-${String(month + 1).padStart(2, "0")}-16`, status: "ABSENT" },
      { date: `${year}-${String(month + 1).padStart(2, "0")}-17`, status: "PRESENT" },
    ],
  });

  const applyLeave = useMutation({
    mutationFn: (data: { studentId: string; fromDate: string; toDate: string; reason: string }) =>
      api.post("/attendance/leave", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Leave application submitted");
      setShowLeave(false);
      setLeaveForm({ fromDate: "", toDate: "", reason: "" });
    },
    onError: () => toast.error("Failed to submit leave application"),
  });

  const workdays = records.filter((r) => r.status !== "WEEKEND" && r.status !== "HOLIDAY");
  const present = workdays.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  const absent = workdays.filter((r) => r.status === "ABSENT").length;
  const late = workdays.filter((r) => r.status === "LATE").length;
  const total = workdays.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const calDays = buildCalendarDays(year, month, records);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

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
        <p className="text-sm">Failed to load attendance data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="bg-card rounded-xl border border-border grid grid-cols-4 divide-x divide-border">
        <div className="p-5 flex items-start gap-3">
          <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Attendance</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{pct}%</p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Present</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{present}</p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Absent</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{absent}</p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Late</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{late}</p>
          </div>
        </div>
      </div>

      {/* Percentage meter */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">Monthly Attendance</span>
          <span className="text-sm font-bold tabular-nums text-foreground">{present}/{total} days</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={cn("text-xs font-medium", pct >= 75 ? "text-green-600 dark:text-green-400" : pct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
          {pct >= 75 ? "Good standing" : pct >= 50 ? "Below recommended 75%" : "Critical — contact admin"}
        </p>
      </div>

      {/* Calendar */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ‹
          </button>
          <h2 className="text-sm font-semibold text-foreground">{MONTH_NAMES[month]} {year}</h2>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ›
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 p-3 gap-1">
          {calDays.map((cell) => {
            if (cell.blank) return <div key={cell.key} />;
            const isWeekend = cell.isWeekend;
            const status: AttendanceStatus | null = cell.rec?.status ?? (isWeekend ? "WEEKEND" : null);
            const cfg = status ? STATUS_CONFIG[status] : null;
            return (
              <div
                key={cell.key}
                title={cell.rec?.remark}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors",
                  cfg ? cfg.cls + " border" : "text-muted-foreground/40"
                )}
              >
                {cell.d}
                {cfg && <div className={cn("w-1 h-1 rounded-full mt-0.5", cfg.dot)} />}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 px-4 pb-4">
          {(["PRESENT","ABSENT","LATE","HOLIDAY"] as AttendanceStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={cn("w-2 h-2 rounded-full", STATUS_CONFIG[s].dot)} />
              {STATUS_CONFIG[s].label}
            </div>
          ))}
        </div>
      </div>

      {/* Apply leave */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setShowLeave((v) => !v)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition text-left focus-visible:outline-none"
        >
          <Send className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Apply for Leave</span>
        </button>
        {showLeave && (
          <div className="border-t border-border px-5 pb-5 pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">From Date</label>
                <input
                  type="date"
                  value={leaveForm.fromDate}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, fromDate: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">To Date</label>
                <input
                  type="date"
                  value={leaveForm.toDate}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, toDate: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Reason</label>
              <textarea
                rows={3}
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Briefly describe the reason for leave…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => applyLeave.mutate({ studentId, fromDate: leaveForm.fromDate, toDate: leaveForm.toDate, reason: leaveForm.reason })}
                disabled={applyLeave.isPending || !leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {applyLeave.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Application
              </button>
              <button onClick={() => setShowLeave(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
