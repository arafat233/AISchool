"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Download } from "lucide-react";
import { api } from "@/lib/api";
import { useChildStore } from "@/store/child.store";

export default function ResultsPage() {
  const activeChildId = useChildStore((s) => s.activeChildId);

  const { data: results, isLoading } = useQuery({
    queryKey: ["results", activeChildId],
    queryFn: () => api.get(`/exams/results/student/${activeChildId}`).then((r) => r.data),
    enabled: !!activeChildId,
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Results</h1>

      {(results ?? []).length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
          No results published yet.
        </div>
      )}

      {(results ?? []).map((r: any) => (
        <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">{r.examTitle}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{r.examDate ? new Date(r.examDate).toLocaleDateString() : ""}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{r.totalMarksObtained ?? "—"} / {r.totalMaxMarks ?? "—"}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              {r.reportCardUrl && (
                <a href={r.reportCardUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition">
                  <Download className="w-3 h-3" />
                  Report Card
                </a>
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {(r.subjectResults ?? []).map((s: any) => (
              <div key={s.subjectId} className="flex items-center justify-between px-5 py-3">
                <p className="text-sm text-gray-700">{s.subjectName}</p>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-semibold text-gray-900">{s.marksObtained} / {s.maxMarks}</p>
                  {s.grade && (
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{s.grade}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
