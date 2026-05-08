"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface TrendRow {
  class_name: string;
  term_name: string;
  total_submissions: number;
  avg_similarity_pct: number;
  high_plagiarism_count: number;
  moderate_count: number;
  clean_count: number;
}

export default function PlagiarismTrendPage() {
  const [filterTerm, setFilterTerm] = useState("all");

  const { data: rows = [], isLoading, error } = useQuery<TrendRow[]>({
    queryKey: ["plagiarism-trends"],
    queryFn: async () => {
      const res = await api.get("/exam/plagiarism/trends");
      return res.data?.data ?? [];
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
  if (error) return (
    <div className="p-4 text-red-500">Failed to load data. Please try again.</div>
  );

  const terms = Array.from(new Set(rows.map((r) => r.term_name)));
  const filtered = filterTerm === "all" ? rows : rows.filter((r) => r.term_name === filterTerm);

  const totalFlagged = filtered.reduce((s, r) => s + r.high_plagiarism_count, 0);
  const totalSubmissions = filtered.reduce((s, r) => s + r.total_submissions, 0);
  const avgSimilarity = filtered.length
    ? (filtered.reduce((s, r) => s + r.avg_similarity_pct, 0) / filtered.length).toFixed(1)
    : "0";

  function riskBadge(avg: number) {
    if (avg >= 50) return <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">High Risk</span>;
    if (avg >= 30) return <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700">Moderate</span>;
    if (avg >= 15) return <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">Low Risk</span>;
    return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">Clean</span>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Plagiarism Trend Report</h1>
        <select
          value={filterTerm}
          onChange={(e) => setFilterTerm(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="all">All Terms</option>
          {terms.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Submissions Scanned</p>
          <p className="text-3xl font-bold text-foreground mt-1">{totalSubmissions}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Avg Similarity</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{avgSimilarity}%</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">High Plagiarism Flags</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{totalFlagged}</p>
        </div>
      </div>

      {/* Trend Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-foreground">By Class &amp; Term</h2>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No plagiarism trend data available</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Class</th>
                <th className="px-4 py-3 text-left">Term</th>
                <th className="px-4 py-3 text-right">Submissions</th>
                <th className="px-4 py-3 text-right">Avg Similarity</th>
                <th className="px-4 py-3 text-right">High Flag</th>
                <th className="px-4 py-3 text-right">Moderate</th>
                <th className="px-4 py-3 text-right">Clean</th>
                <th className="px-4 py-3 text-center">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r, i) => (
                <tr key={i} className="hover:bg-muted">
                  <td className="px-4 py-3 font-medium">{r.class_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.term_name}</td>
                  <td className="px-4 py-3 text-right">{r.total_submissions}</td>
                  <td className="px-4 py-3 text-right font-semibold">{r.avg_similarity_pct}%</td>
                  <td className="px-4 py-3 text-right text-red-600 font-semibold">{r.high_plagiarism_count}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{r.moderate_count}</td>
                  <td className="px-4 py-3 text-right text-green-600">{r.clean_count}</td>
                  <td className="px-4 py-3 text-center">{riskBadge(r.avg_similarity_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Scans run automatically on every assignment submission via BullMQ. Flagged submissions are sent to the teacher review queue. Students see similarity warnings before final submit.
      </p>
    </div>
  );
}
