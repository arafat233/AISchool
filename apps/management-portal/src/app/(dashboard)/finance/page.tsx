"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";

export default function FinancePage() {
  const [monthly, setMonthly] = useState<any[]>([]);
  const [planBreakdown, setPlanBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_SAAS_API_URL ?? "http://localhost:3022";

  useEffect(() => {
    const token = localStorage.getItem("mgmt_token");
    Promise.all([
      axios.get(`${API}/billing/revenue/monthly`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
      axios.get(`${API}/billing/plan-breakdown`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
    ]).then(([m, p]) => {
      setMonthly(m.data);
      setPlanBreakdown(p.data);
    }).finally(() => setLoading(false));
  }, [API]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading finance…</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Financial Reports</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4">Monthly Revenue (₹)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => [`₹${v.toLocaleString()}`, "Revenue"]} />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Breakdown */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4">Revenue by Plan</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={planBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="plan" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => [`₹${v.toLocaleString()}`, "Revenue"]} />
              <Legend />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="schools" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
