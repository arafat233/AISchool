"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  BookOpen,
  ClipboardCheck,
  Clock,
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileText,
} from "lucide-react";
import Link from "next/link";

interface TeacherDashboard {
  totalClasses: number;
  classesToday: number;
  pendingAttendance: number;
  leaveStatus: string | null;
  substituteAlerts: number;
  upcomingPeriods: {
    time: string;
    subject: string;
    class: string;
    section: string;
  }[];
  pendingTasks: {
    id: string;
    label: string;
    href: string;
    urgent: boolean;
  }[];
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  sub,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-4">
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
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: stats } = useQuery<TeacherDashboard>({
    queryKey: ["teacher-dashboard"],
    queryFn: () => api.get("/teacher/dashboard").then((r) => r.data),
    placeholderData: {
      totalClasses: 5,
      classesToday: 3,
      pendingAttendance: 2,
      leaveStatus: null,
      substituteAlerts: 0,
      upcomingPeriods: [
        { time: "9:00 AM", subject: "Mathematics", class: "Grade 8", section: "A" },
        { time: "10:00 AM", subject: "Mathematics", class: "Grade 9", section: "B" },
        { time: "11:00 AM", subject: "Mathematics", class: "Grade 8", section: "C" },
      ],
      pendingTasks: [
        { id: "1", label: "Mark attendance — Grade 8A", href: "/attendance", urgent: true },
        { id: "2", label: "Mark attendance — Grade 9B", href: "/attendance", urgent: true },
      ],
    },
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {greeting()}, {user?.firstName} 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My Classes"
          value={stats?.totalClasses ?? "—"}
          icon={BookOpen}
          color="bg-sidebar"
          sub="assigned this year"
        />
        <StatCard
          title="Classes Today"
          value={stats?.classesToday ?? "—"}
          icon={Calendar}
          color="bg-blue-500"
          sub="periods scheduled"
        />
        <StatCard
          title="Pending Attendance"
          value={stats?.pendingAttendance ?? 0}
          icon={ClipboardCheck}
          color={stats?.pendingAttendance ? "bg-amber-500" : "bg-green-500"}
          sub={stats?.pendingAttendance ? "needs marking" : "all marked"}
        />
        <StatCard
          title="Substitute Alerts"
          value={stats?.substituteAlerts ?? 0}
          icon={AlertCircle}
          color={stats?.substituteAlerts ? "bg-destructive" : "bg-gray-400"}
          sub={stats?.substituteAlerts ? "duty assigned" : "no duties"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's schedule */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Today&apos;s Schedule</h3>
            <Link href="/timetable" className="text-xs text-primary hover:underline">
              Full timetable →
            </Link>
          </div>
          <div className="space-y-2">
            {stats?.upcomingPeriods.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No classes today</p>
            ) : (
              stats?.upcomingPeriods.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-border/50"
                >
                  <div className="w-16 text-xs font-mono text-muted-foreground shrink-0">{p.time}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.class} — Section {p.section}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-sidebar shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending tasks */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Pending Tasks</h3>
            {stats?.pendingAttendance === 0 && (
              <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> All done
              </span>
            )}
          </div>
          <div className="space-y-2">
            {!stats?.pendingTasks.length ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
                <p className="text-sm">Nothing pending — great work!</p>
              </div>
            ) : (
              stats?.pendingTasks.map((task) => (
                <Link
                  key={task.id}
                  href={task.href}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-gray-50 transition group"
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      task.urgent ? "bg-amber-500" : "bg-muted-foreground"
                    }`}
                  />
                  <span className="flex-1 text-sm text-gray-700 group-hover:text-gray-900">
                    {task.label}
                  </span>
                  {task.urgent && (
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                      Urgent
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>

          {/* Leave status */}
          {stats?.leaveStatus && (
            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-center gap-2 text-sm text-blue-700">
              <FileText className="w-4 h-4 shrink-0" />
              Leave application: <span className="font-medium capitalize">{stats.leaveStatus}</span>
            </div>
          )}

          {/* Quick links */}
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2">
            <Link
              href="/attendance"
              className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-gray-50 transition text-xs font-medium text-gray-600"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-primary" />
              Mark Attendance
            </Link>
            <Link
              href="/leave"
              className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-gray-50 transition text-xs font-medium text-gray-600"
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              Apply Leave
            </Link>
            <Link
              href="/timetable"
              className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-gray-50 transition text-xs font-medium text-gray-600"
            >
              <Calendar className="w-3.5 h-3.5 text-primary" />
              View Timetable
            </Link>
            <Link
              href="/classes"
              className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-gray-50 transition text-xs font-medium text-gray-600"
            >
              <Clock className="w-3.5 h-3.5 text-primary" />
              My Classes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
