"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { School, MapPin, Users, CheckCircle, XCircle } from "lucide-react";

interface SchoolTenant {
  id: string;
  name: string;
  city: string;
  state: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  studentCount: number;
  staffCount: number;
  healthScore: number;
  createdAt: string;
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<SchoolTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_SAAS_API_URL ?? "http://localhost:3022";

  useEffect(() => {
    const token = localStorage.getItem("mgmt_token");
    axios.get(`${API}/tenants`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setSchools(r.data))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false));
  }, [API]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading schools…</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Schools</h1>
          <p className="text-sm text-muted-foreground mt-1">{schools.length} tenants registered</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["School", "Location", "Plan", "Students", "Staff", "Health Score", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {schools.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No schools found</td></tr>
            )}
            {schools.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <School size={16} className="text-primary" />
                    <span className="font-medium">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin size={13} />
                    {s.city}, {s.state}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{s.subscriptionPlan}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1"><Users size={13} className="text-muted-foreground" />{s.studentCount}</div>
                </td>
                <td className="px-4 py-3">{s.staffCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.healthScore >= 80 ? "bg-green-500" : s.healthScore >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${s.healthScore}%` }} />
                    </div>
                    <span className="text-xs">{s.healthScore}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {s.subscriptionStatus === "ACTIVE" ? (
                    <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle size={13} />Active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 text-xs"><XCircle size={13} />{s.subscriptionStatus}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
