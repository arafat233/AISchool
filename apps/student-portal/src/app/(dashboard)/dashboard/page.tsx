"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ClipboardCheck,
  CreditCard,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StudentDashboard {
  attendancePercent: number;
  presentDays: number;
  totalDays: number;
  pendingFees: number;
  pendingFeesCount: number;
  upcomingExams: { id: string; subject: string; date: string; type: string }[];
  todayHomework: { id: string; subject: string; description: string; dueDate: string }[];
  recentResults: { subject: string; marks: number; maxMarks: number; grade: string }[];
}

function StatCard({
  title, value, sub, icon: Icon, color, href,
}: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; href?: string;
}) {
  const content = (
    <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-4 hover:shadow-sm transition">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: stats } = useQuery<StudentDashboard>({
    queryKey: ["student-dashboard"],
    queryFn: () => api.get("/student/dashboard").then((r) => r.data),
    placeholderData: {
      attendancePercent: 82,
      presentDays: 148,
      totalDays: 180,
      pendingFees: 1500000,
      pendingFeesCount: 2,
      upcomingExams: [
        { id: "e1", subject: "Mathematics", date: "2026-04-22", type: "Unit Test" },
        { id: "e2", subject: "Science", date: "2026-04-25", type: "Unit Test" },
        { id: "e3", subject: "English", date: "2026-05-02", type: "Mid-Term" },
      ],
      todayHomework: [
        { id: "h1", subject: "Mathematics", description: "Exercise 5.3 Q1–Q10", dueDate: "2026-04-18" },
        { id: "h2", subject: "History", description: "Read Ch. 6 & answer Q1–Q5", dueDate: "2026-04-18" },
      ],
      recentResults: [
        { subject: "Mathematics", marks: 88, maxMarks: 100, grade: "A1" },
        { subject: "Science", marks: 76, maxMarks: 100, grade: "B1" },
        { subject: "English", marks: 92, maxMarks: 100, grade: "A1" },
      ],
    },
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const attendancePct = stats?.attendancePercent ?? 0;
  const attendanceColor =
    attendancePct >= 85 ? "text-green-700" : attendancePct >= 75 ? "text-amber-700" : "text-red-700";
  const attendanceBg =
    attendancePct >= 85 ? "bg-green-500" : attendancePct >= 75 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {greeting()}, {user?.firstName}! 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Low-attendance warning */}
      {attendancePct < 75 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Your attendance is <strong>{attendancePct}%</strong> — below the 75% minimum. Please attend regularly.
          </span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance */}
        <div className="bg-white rounded-xl border border-border p-5 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${attendanceBg}`}>
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Attendance</p>
              <p className={`text-2xl font-bold ${attendanceColor}`}>{attendancePct}%</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${attendanceBg}`} style={{ width: `${attendancePct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {stats?.presentDays} present / {stats?.totalDays} days
          </p>
        </div>

        <StatCard
          title="Pending Fees"
          value={stats ? formatCurrency(stats.pendingFees) : "—"}
          sub={`${stats?.pendingFeesCount ?? 0} invoice(s) due`}
          icon={CreditCard}
          color={stats?.pendingFeesCount ? "bg-amber-500" : "bg-green-500"}
          href="/fees"
        />
        <StatCard
          title="Upcoming Exams"
          value={stats?.upcomingExams.length ?? 0}
          sub="in next 30 days"
          icon={BookOpen}
          color="bg-sidebar"
        />
        <StatCard
          title="Today's Homework"
          value={stats?.todayHomework.length ?? 0}
          sub="assignments pending"
          icon={ClipboardList}
          color={stats?.todayHomework.length ? "bg-blue-500" : "bg-green-500"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's homework */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Today&apos;s Homework</h3>
          {!stats?.todayHomework.length ? (
            <div className="flex flex-col items-center py-6 text-muted-foreground gap-2">
              <CheckCircle2 className="w-7 h-7 text-green-400" />
              <p className="text-sm">No homework today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.todayHomework.map((hw) => (
                <div key={hw.id} className="p-3 rounded-lg bg-gray-50 border border-border/50">
                  <p className="text-xs font-semibold text-primary">{hw.subject}</p>
                  <p className="text-sm text-gray-700 mt-0.5">{hw.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">Due: {formatDate(hw.dueDate)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming exams */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Upcoming Exams</h3>
          {!stats?.upcomingExams.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No exams scheduled</p>
          ) : (
            <div className="space-y-2">
              {stats.upcomingExams.map((exam) => {
                const daysLeft = Math.ceil(
                  (new Date(exam.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div key={exam.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{exam.subject}</p>
                      <p className="text-xs text-muted-foreground">{exam.type} · {formatDate(exam.date)}</p>
                    </div>
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full shrink-0",
                      daysLeft <= 3 ? "bg-red-50 text-red-700" :
                      daysLeft <= 7 ? "bg-amber-50 text-amber-700" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      {daysLeft}d
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent results */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Results</h3>
          {!stats?.recentResults.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No results yet</p>
          ) : (
            <div className="space-y-2">
              {stats.recentResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-border/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{r.subject}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", (r.marks / r.maxMarks) >= 0.75 ? "bg-green-500" : "bg-amber-500")}
                          style={{ width: `${(r.marks / r.maxMarks) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{r.marks}/{r.maxMarks}</span>
                    </div>
                  </div>
                  <span className={cn(
                    "text-sm font-bold shrink-0 w-8 text-center",
                    r.grade.startsWith("A") ? "text-green-700" :
                    r.grade.startsWith("B") ? "text-blue-700" : "text-amber-700"
                  )}>
                    {r.grade}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
