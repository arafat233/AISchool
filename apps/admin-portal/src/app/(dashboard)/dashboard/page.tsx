"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
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

export default function DashboardPage() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/admin/dashboard/stats").then((r) => r.data),
    // Use mock if API unavailable during dev
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
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents ?? "—"}
          icon={Users}
          color="bg-primary"
          sub={`${stats?.activeStudents} active`}
        />
        <StatCard
          title="Today's Attendance"
          value={stats ? `${stats.todayAttendance}%` : "—"}
          icon={ClipboardCheck}
          color="bg-green-500"
          sub="overall present"
        />
        <StatCard
          title="Collected This Month"
          value={stats ? formatCurrency(stats.collectedThisMonth) : "—"}
          icon={CreditCard}
          color="bg-amber-500"
        />
        <StatCard
          title="Outstanding Fees"
          value={stats ? formatCurrency(stats.outstandingFees) : "—"}
          icon={AlertTriangle}
          color="bg-destructive"
          sub={`${stats?.belowThresholdCount} students below 75%`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance week */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">This Week&apos;s Attendance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_ATTENDANCE} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="present" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Present" />
              <Bar dataKey="absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fee trend */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Fee Collection Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={MOCK_FEE_TREND}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
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

      {/* Quick stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-5 col-span-1 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Add Student", href: "/students/new", icon: GraduationCap },
              { label: "Mark Attendance", href: "/attendance", icon: ClipboardCheck },
              { label: "Generate Invoices", href: "/fees", icon: CreditCard },
              { label: "View Reports", href: "/fees", icon: TrendingUp },
            ].map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-gray-50 transition text-sm font-medium text-gray-700"
              >
                <Icon className="w-4 h-4 text-primary" />
                {label}
              </a>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Staff Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Staff</span>
              <span className="font-semibold text-gray-900">{stats?.totalStaff ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Teachers</span>
              <span className="font-semibold text-gray-900">28</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Non-Teaching</span>
              <span className="font-semibold text-gray-900">10</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
