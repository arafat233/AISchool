"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CreditCard, BookOpen, Clock, Award, Bus, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useChildStore } from "@/store/child.store";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const activeChildId = useChildStore((s) => s.activeChildId);

  const { data, isLoading } = useQuery({
    queryKey: ["parent-dashboard", activeChildId],
    queryFn: () => api.get(`/students/${activeChildId}/dashboard-summary`).then((r) => r.data),
    enabled: !!activeChildId,
  });

  if (!activeChildId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No child linked to your account. Contact the school admin.
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const d = data ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview for your child</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard icon={CalendarCheck} label="Attendance" value={`${d.attendancePercent ?? "—"}%`} sub="This month" color="bg-emerald-500" />
        <StatCard icon={CreditCard} label="Fee Due" value={d.feeDue != null ? `₹${d.feeDue.toLocaleString()}` : "—"} sub="Pending" color="bg-rose-500" />
        <StatCard icon={BookOpen} label="Homework Due" value={d.homeworkDue ?? "—"} sub="Pending submissions" color="bg-amber-500" />
        <StatCard icon={Clock} label="Upcoming Exam" value={d.nextExam ?? "—"} sub={d.nextExamDate ?? ""} color="bg-blue-500" />
        <StatCard icon={Award} label="Last Result" value={d.lastResult ?? "—"} sub={d.lastResultExam ?? ""} color="bg-violet-500" />
        <StatCard icon={Bus} label="Bus Status" value={d.busStatus ?? "—"} sub={d.busEta ? `ETA: ${d.busEta}` : ""} color="bg-orange-500" />
      </div>

      {d.alerts?.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Alerts</h2>
          {d.alerts.map((alert: string, i: number) => (
            <div key={i} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">{alert}</p>
            </div>
          ))}
        </div>
      )}

      {d.recentAnnouncements?.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Announcements</h2>
          <div className="space-y-2">
            {d.recentAnnouncements.map((a: any) => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                <p className="text-sm font-medium text-gray-800">{a.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{new Date(a.publishedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
