"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useChildStore } from "@/store/child.store";
import { format } from "date-fns";

const statusIcon = (s: string) => {
  if (s === "PRESENT") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (s === "ABSENT") return <XCircle className="w-4 h-4 text-rose-500" />;
  return <MinusCircle className="w-4 h-4 text-amber-500" />;
};

export default function AttendancePage() {
  const activeChildId = useChildStore((s) => s.activeChildId);

  const { data, isLoading } = useQuery({
    queryKey: ["attendance-summary", activeChildId],
    queryFn: () => api.get(`/attendance/student/${activeChildId}/summary`).then((r) => r.data),
    enabled: !!activeChildId,
  });

  const { data: history } = useQuery({
    queryKey: ["attendance-history", activeChildId],
    queryFn: () => api.get(`/attendance/student/${activeChildId}`).then((r) => r.data),
    enabled: !!activeChildId,
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Attendance</h1>

      {data && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Overall %", value: `${data.overallPercent ?? 0}%`, color: "text-emerald-600" },
            { label: "Present Days", value: data.presentDays ?? 0, color: "text-blue-600" },
            { label: "Absent Days", value: data.absentDays ?? 0, color: "text-rose-600" },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="text-sm font-semibold text-foreground">Attendance History</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {(history ?? []).slice(0, 30).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                {statusIcon(r.status)}
                <p className="text-sm text-foreground">{format(new Date(r.date), "EEE, dd MMM yyyy")}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                r.status === "PRESENT" ? "bg-emerald-50 text-emerald-700" :
                r.status === "ABSENT"  ? "bg-rose-50 text-rose-700" :
                "bg-amber-50 text-amber-700"
              }`}>{r.status}</span>
            </div>
          ))}
          {!history?.length && <p className="px-5 py-8 text-sm text-muted-foreground text-center">No records found</p>}
        </div>
      </div>
    </div>
  );
}
