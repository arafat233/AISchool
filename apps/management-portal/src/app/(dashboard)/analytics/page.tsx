"use client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Users, DollarSign, AlertCircle, Loader2 } from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiInsight {
  type: "warning" | "insight";
  text: string;
}

interface EnrollmentEntry {
  month: string;
  students: number;
}

interface RevenueEntry {
  month: string;
  revenue: number;
}

interface PlatformSummary {
  totalStudents: number;
  totalSchools: number;
  activeSubscriptions: number;
  mrr: number;
  enrollmentTrend: EnrollmentEntry[];
  revenueTrend: RevenueEntry[];
  aiInsights: AiInsight[];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="h-[220px] flex items-center justify-center text-muted-foreground">
      <Loader2 className="animate-spin w-6 h-6" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<PlatformSummary>({
    queryKey: ["management-analytics"],
    queryFn: () => api.get("/management/analytics/summary").then((r) => r.data),
    // Fallback placeholder so layout never collapses while fetching
    placeholderData: {
      totalStudents: 0,
      totalSchools: 0,
      activeSubscriptions: 0,
      mrr: 0,
      enrollmentTrend: [],
      revenueTrend: [],
      aiInsights: [],
    },
    staleTime: 5 * 60_000, // 5-minute cache — analytics don't need real-time refresh
  });

  const insights = data?.aiInsights ?? [];
  const enrollmentTrend = data?.enrollmentTrend ?? [];
  const revenueTrend = data?.revenueTrend ?? [];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Analytics &amp; AI Insights</h1>
      <p className="text-sm text-muted-foreground mb-8">Platform-wide intelligence across all schools</p>

      {/* AI Insights */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" /> AI Insights
        </h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin w-4 h-4" /> Loading insights…
          </div>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No insights available yet.</p>
        ) : (
          <div className="space-y-3">
            {insights.map((ins, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                  ins.type === "warning"
                    ? "bg-orange-50 border border-orange-200"
                    : "bg-blue-50 border border-blue-200"
                }`}
              >
                <AlertCircle
                  size={15}
                  className={`mt-0.5 flex-shrink-0 ${
                    ins.type === "warning" ? "text-orange-500" : "text-blue-500"
                  }`}
                />
                <span className={ins.type === "warning" ? "text-orange-800" : "text-blue-800"}>
                  {ins.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trend */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Users size={15} /> Student Enrollment Trend
          </h2>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={enrollmentTrend}>
                <defs>
                  <linearGradient id="studentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="students"
                  stroke="#3b82f6"
                  fill="url(#studentGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue Trend */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign size={15} /> Platform Revenue Trend (₹)
          </h2>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => `₹${v.toLocaleString()}`} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  fill="url(#revenueGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
