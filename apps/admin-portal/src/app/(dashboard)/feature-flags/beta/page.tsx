"use client";
/**
 * Beta School Program
 * Manage which schools are enrolled in the beta program
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface BetaSchool {
  tenantId: string;
  schoolName: string;
  city: string;
  enrolledAt: string;
  activeStudents: number;
  feedback?: string;
}

export default function BetaProgramPage() {
  const [search, setSearch] = useState("");

  const { data: betaSchools = [], isLoading, error } = useQuery<BetaSchool[]>({
    queryKey: ["feature-flags-beta"],
    queryFn: async () => {
      const res = await api.get("/ops/feature-flags/beta");
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

  const filtered = betaSchools.filter(s => s.schoolName.toLowerCase().includes(search.toLowerCase()));

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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(school => (
              <tr key={school.tenantId} className="hover:bg-muted">
                <td className="px-5 py-3 font-medium text-foreground">{school.schoolName}</td>
                <td className="px-5 py-3 text-muted-foreground">{school.city}</td>
                <td className="px-5 py-3 text-right text-foreground">{school.activeStudents.toLocaleString()}</td>
                <td className="px-5 py-3 text-muted-foreground">{school.enrolledAt}</td>
                <td className="px-5 py-3 text-muted-foreground text-xs">{school.feedback ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">No beta schools found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
