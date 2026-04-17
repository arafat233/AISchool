"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useChildStore } from "@/store/child.store";
import { format } from "date-fns";

export default function HomeworkPage() {
  const activeChildId = useChildStore((s) => s.activeChildId);

  const { data, isLoading } = useQuery({
    queryKey: ["homework", activeChildId],
    queryFn: () => api.get(`/homework?studentId=${activeChildId}`).then((r) => r.data),
    enabled: !!activeChildId,
  });

  const { data: progress } = useQuery({
    queryKey: ["lms-progress", activeChildId],
    queryFn: () => api.get(`/lms/progress/${activeChildId}`).then((r) => r.data),
    enabled: !!activeChildId,
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const pending = (data ?? []).filter((h: any) => !h.submitted);
  const submitted = (data ?? []).filter((h: any) => h.submitted);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Homework & LMS Progress</h1>

      {/* LMS Course Progress */}
      {progress?.courses?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Course Progress</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {progress.courses.map((c: any) => (
              <div key={c.courseId} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-800">{c.courseName}</p>
                  <span className="text-xs font-semibold text-primary">{c.percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${c.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending homework */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Pending Homework</h2>
          <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-medium">{pending.length} pending</span>
        </div>
        <div className="divide-y divide-gray-100">
          {pending.map((h: any) => (
            <div key={h.id} className="flex items-center gap-3 px-5 py-3">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{h.title}</p>
                <p className="text-xs text-gray-500">{h.subjectName} · Due: {format(new Date(h.dueDate), "dd MMM yyyy")}</p>
              </div>
            </div>
          ))}
          {!pending.length && <p className="px-5 py-6 text-sm text-gray-400 text-center">All homework submitted</p>}
        </div>
      </div>

      {/* Submitted */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Submitted</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {submitted.slice(0, 10).map((h: any) => (
            <div key={h.id} className="flex items-center gap-3 px-5 py-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">{h.title}</p>
                <p className="text-xs text-gray-500">{h.subjectName}</p>
              </div>
              {h.grade && <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{h.grade}</span>}
            </div>
          ))}
          {!submitted.length && <p className="px-5 py-6 text-sm text-gray-400 text-center">Nothing submitted yet</p>}
        </div>
      </div>
    </div>
  );
}
