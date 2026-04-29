"use client";
import { useEffect, useState } from "react";
import axios from "axios";
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_REPORT_API_URL ?? "http://localhost:3021";
  const SAAS_API = process.env.NEXT_PUBLIC_SAAS_API_URL ?? "http://localhost:3022";

  useEffect(() => {
    const token = localStorage.getItem("mgmt_token");
    Promise.all([
      axios.get(`${SAAS_API}/tenants/summary`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { totalSchools: 0, totalStudents: 0 } })),
      axios.get(`${SAAS_API}/billing/revenue/mtd`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { totalRevenueMtd: 0, totalPendingFees: 0 } })),
      axios.get(`${SAAS_API}/health/services`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { services: [] } })),
    ]).then(([summary, billing, health]) => {
      setData({
        totalSchools: summary.data.totalSchools ?? 0,
        totalStudents: summary.data.totalStudents ?? 0,
        totalRevenueMtd: billing.data.totalRevenueMtd ?? 0,
        totalPendingFees: billing.data.totalPendingFees ?? 0,
        attendanceAvgPct: summary.data.attendanceAvgPct ?? 0,
        activeAdmissions: summary.data.activeAdmissions ?? 0,
        systemHealth: health.data.services ?? [],
      });
    }).finally(() => setLoading(false));
  }, [API, SAAS_API]);

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground">Loading dashboard…</div>;

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
