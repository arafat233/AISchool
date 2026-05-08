"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { School, DollarSign, Users, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

interface DashboardData {
  totalSchools: number;
  totalStudents: number;
  totalRevenueMtd: number;
  totalPendingFees: number;
  attendanceAvgPct: number;
  activeAdmissions: number;
  systemHealth: { service: string; status: "ok" | "down" }[];
}

function StatCard({ title, value, sub, icon: Icon, color }: { title: string; value: string | number; sub?: string; icon: any; color: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export default function ManagementDashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["management-dashboard"],
    queryFn: async () => {
      const [summary, billing, health] = await Promise.all([
        api.get("/tenants/summary").catch(() => ({ data: { totalSchools: 0, totalStudents: 0 } })),
        api.get("/billing/revenue/mtd").catch(() => ({ data: { totalRevenueMtd: 0, totalPendingFees: 0 } })),
        api.get("/health/services").catch(() => ({ data: { services: [] } })),
      ]);
      return {
        totalSchools: summary.data.totalSchools ?? 0,
        totalStudents: summary.data.totalStudents ?? 0,
        totalRevenueMtd: billing.data.totalRevenueMtd ?? 0,
        totalPendingFees: billing.data.totalPendingFees ?? 0,
        attendanceAvgPct: summary.data.attendanceAvgPct ?? 0,
        activeAdmissions: summary.data.activeAdmissions ?? 0,
        systemHealth: health.data.services ?? [],
      };
    },
  });

  if (isLoading) return (
    <div className="p-8 space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-muted rounded-lg" />
      <div className="h-4 w-48 bg-muted rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-muted rounded-xl" />
            <div className="space-y-2">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-6 w-14 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-6 space-y-3">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-8 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Management Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Multi-school overview — real-time metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Schools" value={data?.totalSchools ?? 0} icon={School} color="bg-blue-500" />
        <StatCard title="Total Students" value={(data?.totalStudents ?? 0).toLocaleString()} icon={Users} color="bg-green-500" />
        <StatCard title="Revenue MTD" value={`₹${((data?.totalRevenueMtd ?? 0) / 100000).toFixed(1)}L`} icon={DollarSign} color="bg-purple-500" />
        <StatCard title="Avg Attendance" value={`${data?.attendanceAvgPct ?? 0}%`} icon={TrendingUp} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Fees Alert */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2"><AlertTriangle size={16} className="text-orange-500" /> Outstanding Fees</h2>
          <p className="text-3xl font-bold text-orange-600">₹{((data?.totalPendingFees ?? 0) / 100000).toFixed(2)}L</p>
          <p className="text-sm text-muted-foreground mt-1">Across all schools</p>
        </div>

        {/* System Health */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> System Health</h2>
          {data?.systemHealth && data.systemHealth.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {data.systemHealth.map((s) => (
                <div key={s.service} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{s.service}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">All services operational</p>
          )}
        </div>

        {/* Active Admissions */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Active Admissions</h2>
          <p className="text-3xl font-bold text-blue-600">{data?.activeAdmissions ?? 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Applications in pipeline</p>
        </div>
      </div>
    </div>
  );
}
