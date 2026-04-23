"use client";
/**
 * Beta School Program
 * Manage which schools are enrolled in the beta program
 */
import { useState } from "react";

interface BetaSchool {
  tenantId: string;
  schoolName: string;
  city: string;
  enrolledAt: string;
  activeStudents: number;
  feedback?: string;
}

const MOCK_BETA_SCHOOLS: BetaSchool[] = [
  { tenantId: "t1", schoolName: "Delhi Public School — Noida", city: "Noida", enrolledAt: "2026-01-15", activeStudents: 3240, feedback: "Blockchain certs working well" },
  { tenantId: "t2", schoolName: "St. Xavier's High School", city: "Mumbai", enrolledAt: "2026-02-01", activeStudents: 1820 },
  { tenantId: "t3", schoolName: "Kendriya Vidyalaya No. 1", city: "Bangalore", enrolledAt: "2026-02-20", activeStudents: 2100 },
];

export default function BetaProgramPage() {
  const [betaSchools, setBetaSchools] = useState<BetaSchool[]>(MOCK_BETA_SCHOOLS);
  const [search, setSearch] = useState("");

  const removeBeta = (tenantId: string) => {
    setBetaSchools(prev => prev.filter(s => s.tenantId !== tenantId));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Beta School Program</h1>
          <p className="text-sm text-muted-foreground mt-1">Beta schools receive new features before general availability</p>
        </div>
        <a href="/feature-flags" className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">
          ← Feature Flags
        </a>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800">
        <strong>{betaSchools.length} schools</strong> enrolled in the beta program. Beta schools receive features at 0% global rollout and provide early feedback before wider release.
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <input
            type="text"
            placeholder="Search schools..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border border-input rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-5 py-3 text-left">School</th>
              <th className="px-5 py-3 text-left">City</th>
              <th className="px-5 py-3 text-right">Students</th>
              <th className="px-5 py-3 text-left">Enrolled</th>
              <th className="px-5 py-3 text-left">Feedback</th>
              <th className="px-5 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {betaSchools.filter(s => s.schoolName.toLowerCase().includes(search.toLowerCase())).map(school => (
              <tr key={school.tenantId} className="hover:bg-muted">
                <td className="px-5 py-3 font-medium text-foreground">{school.schoolName}</td>
                <td className="px-5 py-3 text-muted-foreground">{school.city}</td>
                <td className="px-5 py-3 text-right text-foreground">{school.activeStudents.toLocaleString()}</td>
                <td className="px-5 py-3 text-muted-foreground">{school.enrolledAt}</td>
                <td className="px-5 py-3 text-muted-foreground text-xs">{school.feedback ?? "—"}</td>
                <td className="px-5 py-3 text-center">
                  <button onClick={() => removeBeta(school.tenantId)} className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1 rounded-md hover:bg-red-50">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
