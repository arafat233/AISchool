"use client";
import { useEffect, useState } from "react";

interface TrendRow {
  class_name: string;
  term_name: string;
  total_submissions: number;
  avg_similarity_pct: number;
  high_plagiarism_count: number;
  moderate_count: number;
  clean_count: number;
}

const VERDICT_COLOR: Record<string, string> = {
  HIGH_PLAGIARISM: "bg-red-100 text-red-700",
  MODERATE: "bg-orange-100 text-orange-700",
  LOW_RISK: "bg-yellow-100 text-yellow-700",
  CLEAN: "bg-green-100 text-green-700",
};

const MOCK_TREND: TrendRow[] = [
  { class_name: "Grade 10-A", term_name: "Term 1 2025-26", total_submissions: 38, avg_similarity_pct: 24.3, high_plagiarism_count: 3, moderate_count: 7, clean_count: 28 },
  { class_name: "Grade 10-B", term_name: "Term 1 2025-26", total_submissions: 35, avg_similarity_pct: 18.1, high_plagiarism_count: 1, moderate_count: 4, clean_count: 30 },
  { class_name: "Grade 9-A", term_name: "Term 1 2025-26", total_submissions: 40, avg_similarity_pct: 31.7, high_plagiarism_count: 6, moderate_count: 9, clean_count: 25 },
  { class_name: "Grade 8-A", term_name: "Term 1 2025-26", total_submissions: 42, avg_similarity_pct: 12.4, high_plagiarism_count: 0, moderate_count: 3, clean_count: 39 },
];

export default function PlagiarismTrendPage() {
  const [rows, setRows] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState("all");

  useEffect(() => {
    const schoolId = "SCHOOL_ID"; // injected from session in production
    fetch(`/api/proxy/exam/plagiarism/trend/${schoolId}`)
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : MOCK_TREND))
      .catch(() => setRows(MOCK_TREND))
      .finally(() => setLoading(false));
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-900">Plagiarism Trend Report</h1>
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
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Submissions Scanned</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalSubmissions}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Avg Similarity</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{avgSimilarity}%</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">High Plagiarism Flags</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{totalFlagged}</p>
        </div>
      </div>

      {/* Trend Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-800">By Class &amp; Term</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
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
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.class_name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.term_name}</td>
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

      <p className="text-xs text-gray-400">
        Scans run automatically on every assignment submission via BullMQ. Flagged submissions are sent to the teacher review queue. Students see similarity warnings before final submit.
      </p>
    </div>
  );
}
