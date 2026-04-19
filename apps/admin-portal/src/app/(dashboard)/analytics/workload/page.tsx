"use client";
import { useEffect, useState } from "react";

interface WorkloadRow {
  teacher_name: string;
  subject: string;
  periods_per_week: number;
  student_count: number;
  assignments_pending: number;
  extra_duties: number;
  workload_score: number;
  status: "NORMAL" | "HIGH" | "OVERLOADED";
}

const MOCK: WorkloadRow[] = [
  { teacher_name: "Priya Sharma", subject: "Mathematics", periods_per_week: 32, student_count: 180, assignments_pending: 45, extra_duties: 3, workload_score: 91, status: "OVERLOADED" },
  { teacher_name: "Ravi Kumar", subject: "Science", periods_per_week: 28, student_count: 150, assignments_pending: 30, extra_duties: 2, workload_score: 78, status: "HIGH" },
  { teacher_name: "Anitha Reddy", subject: "English", periods_per_week: 24, student_count: 120, assignments_pending: 20, extra_duties: 1, workload_score: 58, status: "NORMAL" },
  { teacher_name: "Suresh Nair", subject: "Social Studies", periods_per_week: 22, student_count: 110, assignments_pending: 18, extra_duties: 1, workload_score: 51, status: "NORMAL" },
  { teacher_name: "Meera Iyer", subject: "Physics", periods_per_week: 30, student_count: 160, assignments_pending: 38, extra_duties: 4, workload_score: 88, status: "HIGH" },
];

const STATUS_STYLE: Record<string, string> = {
  OVERLOADED: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  NORMAL: "bg-green-100 text-green-700",
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-red-500" : score >= 60 ? "bg-orange-400" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{score}</span>
    </div>
  );
}

export default function TeacherWorkloadPage() {
  const [rows, setRows] = useState<WorkloadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/proxy/ai/predict/teacher-workload?school_id=SCHOOL_ID")
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : MOCK))
      .catch(() => setRows(MOCK))
      .finally(() => setLoading(false));
  }, []);

  const overloaded = rows.filter((r) => r.status === "OVERLOADED").length;
  const high = rows.filter((r) => r.status === "HIGH").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Teacher Workload Analytics</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          Reassign Duties
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Teachers</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{rows.length}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Overloaded</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{overloaded}</p>
          <p className="text-xs text-gray-400 mt-1">Score &gt; 80 — do not assign more</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">High Load</p>
          <p className="text-3xl font-bold text-orange-500 mt-1">{high}</p>
          <p className="text-xs text-gray-400 mt-1">Score 60-80 — monitor closely</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b font-semibold text-gray-800">Staff Workload Breakdown</div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Teacher</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-right">Periods/wk</th>
                <th className="px-4 py-3 text-right">Students</th>
                <th className="px-4 py-3 text-right">Pending Reviews</th>
                <th className="px-4 py-3 text-right">Extra Duties</th>
                <th className="px-4 py-3 w-40">Workload Score</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.teacher_name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.subject}</td>
                  <td className="px-4 py-3 text-right">{r.periods_per_week}</td>
                  <td className="px-4 py-3 text-right">{r.student_count}</td>
                  <td className="px-4 py-3 text-right">{r.assignments_pending}</td>
                  <td className="px-4 py-3 text-right">{r.extra_duties}</td>
                  <td className="px-4 py-3"><ScoreBar score={r.workload_score} /></td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
