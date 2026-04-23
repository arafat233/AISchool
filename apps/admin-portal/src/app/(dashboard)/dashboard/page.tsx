"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  TrendingUp,
  GraduationCap,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalStaff: number;
  todayAttendance: number;
  outstandingFees: number;
  collectedThisMonth: number;
  belowThresholdCount: number;
}

type StatVariant = "default" | "success" | "warning" | "danger";

const variantTextClass: Record<StatVariant, string> = {
  default: "text-primary",
  success: "text-green-600 dark:text-green-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-destructive",
};

function StatItem({
  title,
  value,
  sub,
  variant = "default",
}: {
  title: string;
  value: string | number;
  sub?: string;
  variant?: StatVariant;
}) {
  return (
    <div className="p-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
      <p className={cn("text-3xl font-bold mt-2 tabular-nums", variantTextClass[variant])}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

const MOCK_ATTENDANCE = [
  { day: "Mon", present: 420, absent: 30 },
  { day: "Tue", present: 410, absent: 40 },
  { day: "Wed", present: 435, absent: 15 },
  { day: "Thu", present: 405, absent: 45 },
  { day: "Fri", present: 390, absent: 60 },
];

const MOCK_FEE_TREND = [
  { month: "Jan", collected: 1200000 },
  { month: "Feb", collected: 980000 },
  { month: "Mar", collected: 1450000 },
  { month: "Apr", collected: 1100000 },
  { month: "May", collected: 1600000 },
  { month: "Jun", collected: 1350000 },
];

const QUICK_ACTIONS = [
  { label: "Add Student", href: "/students/new", icon: GraduationCap },
  { label: "Mark Attendance", href: "/attendance", icon: ClipboardCheck },
  { label: "Generate Invoices", href: "/fees", icon: CreditCard },
  { label: "View Reports", href: "/fees", icon: TrendingUp },
];

export default function DashboardPage() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/admin/dashboard/stats").then((r) => r.data),
    placeholderData: {
      totalStudents: 450,
      activeStudents: 442,
      totalStaff: 38,
      todayAttendance: 87,
      outstandingFees: 320000,
      collectedThisMonth: 1350000,
      belowThresholdCount: 12,
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats strip — single container, 4 divided sections */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-2 divide-y divide-border lg:grid-cols-4 lg:divide-y-0 lg:divide-x lg:divide-border">
          <StatItem
            title="Total Students"
            value={stats?.totalStudents ?? "—"}
            sub={`${stats?.activeStudents} active`}
          />
          <StatItem
            title="Today's Attendance"
            value={stats ? `${stats.todayAttendance}%` : "—"}
            sub="overall present"
            variant="success"
          />
          <StatItem
            title="Collected This Month"
            value={stats ? formatCurrency(stats.collectedThisMonth) : "—"}
            variant="warning"
          />
          <StatItem
            title="Outstanding Fees"
            value={stats ? formatCurrency(stats.outstandingFees) : "—"}
            sub={`${stats?.belowThresholdCount} students below 75%`}
            variant="danger"
          />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">This Week&apos;s Attendance</h3>
          <div className="h-48 md:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_ATTENDANCE} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="present" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Fee Collection Trend</h3>
          <div className="h-48 md:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_FEE_TREND}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line
                  type="monotone"
                  dataKey="collected"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  name="Collected"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions — no outer card, just an action row */}
        <div className="col-span-1 lg:col-span-2 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="w-4 h-4 text-primary" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Staff Overview */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Staff Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Staff</span>
              <span className="font-semibold text-foreground tabular-nums">{stats?.totalStaff ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Teachers</span>
              <span className="font-semibold text-foreground tabular-nums">28</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Non-Teaching</span>
              <span className="font-semibold text-foreground tabular-nums">10</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
