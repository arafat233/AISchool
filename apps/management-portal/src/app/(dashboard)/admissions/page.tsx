"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdmissionsPage() {
  const [funnels, setFunnels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_REPORT_API_URL ?? "http://localhost:3021";

  useEffect(() => {
    // Placeholder — in production would fetch per-school funnels
    setFunnels([
      { school: "School A", submitted: 120, reviewed: 95, shortlisted: 60, enrolled: 48, conversionRate: 40 },
      { school: "School B", submitted: 85, reviewed: 70, shortlisted: 45, enrolled: 38, conversionRate: 45 },
      { school: "School C", submitted: 200, reviewed: 160, shortlisted: 100, enrolled: 75, conversionRate: 38 },
    ]);
    setLoading(false);
  }, [API]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading admissions…</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Admission Funnel</h1>

      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <h2 className="font-semibold mb-4">Applications by Stage — All Schools</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={funnels}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="school" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="submitted" fill="#3b82f6" name="Submitted" radius={[3, 3, 0, 0]} />
            <Bar dataKey="shortlisted" fill="#8b5cf6" name="Shortlisted" radius={[3, 3, 0, 0]} />
            <Bar dataKey="enrolled" fill="#10b981" name="Enrolled" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["School", "Submitted", "Reviewed", "Shortlisted", "Enrolled", "Conversion %"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {funnels.map((f) => (
              <tr key={f.school} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{f.school}</td>
                <td className="px-4 py-3">{f.submitted}</td>
                <td className="px-4 py-3">{f.reviewed}</td>
                <td className="px-4 py-3">{f.shortlisted}</td>
                <td className="px-4 py-3">{f.enrolled}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${f.conversionRate >= 40 ? "text-green-600" : "text-orange-500"}`}>{f.conversionRate}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
