"use client";
import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Users, RefreshCcw, Target,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import axios from "axios";

// ─── Fallback mock data so charts render even if saas-service is offline ──────
const MOCK_MONTHLY = [
  { month: "Apr", mrr: 420000, schools: 8, churnedSchools: 0 },
  { month: "May", mrr: 455000, schools: 9, churnedSchools: 0 },
  { month: "Jun", mrr: 440000, schools: 9, churnedSchools: 1 },
  { month: "Jul", mrr: 510000, schools: 11, churnedSchools: 0 },
  { month: "Aug", mrr: 550000, schools: 12, churnedSchools: 0 },
  { month: "Sep", mrr: 530000, schools: 12, churnedSchools: 1 },
  { month: "Oct", mrr: 580000, schools: 13, churnedSchools: 0 },
  { month: "Nov", mrr: 600000, schools: 14, churnedSchools: 0 },
  { month: "Dec", mrr: 570000, schools: 14, churnedSchools: 1 },
  { month: "Jan", mrr: 620000, schools: 15, churnedSchools: 0 },
  { month: "Feb", mrr: 660000, schools: 16, churnedSchools: 0 },
  { month: "Mar", mrr: 710000, schools: 17, churnedSchools: 0 },
];

const MOCK_PLAN = [
  { plan: "Basic", schools: 5, mrr: 125000, studentsTotal: 2400 },
  { plan: "Standard", schools: 7, mrr: 280000, studentsTotal: 4200 },
  { plan: "Premium", schools: 4, mrr: 240000, studentsTotal: 3100 },
  { plan: "Enterprise", schools: 1, mrr: 65000, studentsTotal: 800 },
];

interface SaasMetrics {
  mrr: number;
  arr: number;
  activeSchools: number;
  totalStudents: number;
  churnRate: number;
  nrr: number;
  ltv: number;
  cac: number;
  revenuePerStudent: number;
  monthlyData: typeof MOCK_MONTHLY;
  planBreakdown: typeof MOCK_PLAN;
}

function KpiCard({
  label, value, delta, icon: Icon, color, sub,
}: {
  label: string; value: string; delta?: number; icon: any; color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={15} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      {delta !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${delta >= 0 ? "text-green-600" : "text-red-500"}`}>
          {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(delta).toFixed(1)}% vs last month
        </div>
      )}
    </div>
  );
}

export default function SaasReportsPage() {
  const [metrics, setMetrics] = useState<SaasMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_SAAS_API_URL ?? "http://localhost:3022";

  useEffect(() => {
    const token = localStorage.getItem("mgmt_token");
    axios
      .get(`${API}/saas/metrics`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setMetrics(r.data))
      .catch(() => {
        // Compute mock metrics from MOCK_MONTHLY
        const latest = MOCK_MONTHLY[MOCK_MONTHLY.length - 1];
        const prev = MOCK_MONTHLY[MOCK_MONTHLY.length - 2];
        const totalStudents = MOCK_PLAN.reduce((s, p) => s + p.studentsTotal, 0);
        setMetrics({
          mrr: latest.mrr,
          arr: latest.mrr * 12,
          activeSchools: latest.schools,
          totalStudents,
          churnRate: parseFloat(((MOCK_MONTHLY.filter((m) => m.churnedSchools > 0).length / MOCK_MONTHLY.length) * 100).toFixed(1)),
          nrr: 112,
          ltv: 1800000,
          cac: 45000,
          revenuePerStudent: Math.round(latest.mrr / totalStudents),
          monthlyData: MOCK_MONTHLY,
          planBreakdown: MOCK_PLAN,
        });
      })
      .finally(() => setLoading(false));
  }, [API]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading SaaS analytics…</div>;
  if (!metrics) return null;

  const ltvcac = metrics.cac > 0 ? (metrics.ltv / metrics.cac).toFixed(1) : "—";
  const prevMrr = metrics.monthlyData[metrics.monthlyData.length - 2]?.mrr ?? metrics.mrr;
  const mrrDelta = prevMrr > 0 ? ((metrics.mrr - prevMrr) / prevMrr) * 100 : 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">SaaS Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">MRR, ARR, churn, NRR, LTV:CAC — your business health</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="MRR" value={`₹${(metrics.mrr / 100000).toFixed(2)}L`} delta={mrrDelta} icon={DollarSign} color="bg-blue-500" sub="Monthly Recurring Revenue" />
        <KpiCard label="ARR" value={`₹${(metrics.arr / 10000000).toFixed(2)}Cr`} icon={TrendingUp} color="bg-purple-500" sub="Annual Run Rate" />
        <KpiCard label="Active Schools" value={String(metrics.activeSchools)} icon={Users} color="bg-green-500" sub="Paying tenants" />
        <KpiCard label="Revenue / Student" value={`₹${metrics.revenuePerStudent}`} icon={Target} color="bg-orange-500" sub={`${metrics.totalStudents.toLocaleString()} total students`} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Churn Rate" value={`${metrics.churnRate}%`} icon={TrendingDown} color="bg-red-500" sub="Monthly school churn" />
        <KpiCard label="NRR" value={`${metrics.nrr}%`} icon={RefreshCcw} color="bg-teal-500" sub="Net Revenue Retention" />
        <KpiCard label="LTV" value={`₹${(metrics.ltv / 100000).toFixed(0)}L`} icon={DollarSign} color="bg-indigo-500" sub="Customer Lifetime Value" />
        <KpiCard label="LTV : CAC" value={`${ltvcac}x`} icon={Target} color="bg-emerald-500" sub={`CAC: ₹${(metrics.cac / 1000).toFixed(0)}K`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* MRR Trend */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4">MRR Trend (₹)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={metrics.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: any) => [`₹${v.toLocaleString()}`, "MRR"]} />
              <Line type="monotone" dataKey="mrr" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* School Growth */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4">School Count Growth</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={metrics.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="schools" name="Active Schools" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="churnedSchools" name="Churned" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Plan Breakdown Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold">Revenue by Plan</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Plan", "Schools", "MRR (₹)", "Students", "Rev / Student (₹)", "% of Total MRR"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {metrics.planBreakdown.map((p) => {
              const revPerStudent = p.studentsTotal > 0 ? Math.round(p.mrr / p.studentsTotal) : 0;
              const pct = metrics.mrr > 0 ? ((p.mrr / metrics.mrr) * 100).toFixed(1) : "0";
              return (
                <tr key={p.plan} className="hover:bg-muted/30 transition">
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{p.plan}</span>
                  </td>
                  <td className="px-4 py-3">{p.schools}</td>
                  <td className="px-4 py-3 font-medium">₹{p.mrr.toLocaleString()}</td>
                  <td className="px-4 py-3">{p.studentsTotal.toLocaleString()}</td>
                  <td className="px-4 py-3">₹{revPerStudent}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
