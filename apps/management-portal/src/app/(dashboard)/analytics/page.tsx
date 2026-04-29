"use client";
import { useEffect, useState } from "react";
import { TrendingUp, Users, BookOpen, DollarSign, AlertCircle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";

// AI Insights: static model-driven observations (would be dynamic in production)
const AI_INSIGHTS = [
  { type: "warning", text: "3 schools have attendance below 70% this month — risk of regulatory flags." },
  { type: "insight", text: "Fee collection efficiency up 12% YoY. Online payment adoption driving improvement." },
  { type: "insight", text: "Admission conversions peak in March-April. Recommend targeted campaigns in Feb." },
  { type: "warning", text: "Library-service has highest error rate (2.3%) — consider capacity review." },
  { type: "insight", text: "Schools on PRO plan show 18% higher student retention than BASIC plan schools." },
];

const enrollmentTrend = [
  { month: "Apr", students: 4200 }, { month: "May", students: 4350 }, { month: "Jun", students: 4100 },
  { month: "Jul", students: 4500 }, { month: "Aug", students: 4800 }, { month: "Sep", students: 4950 },
  { month: "Oct", students: 5100 }, { month: "Nov", students: 5050 }, { month: "Dec", students: 4900 },
  { month: "Jan", students: 5200 }, { month: "Feb", students: 5400 }, { month: "Mar", students: 5600 },
];

const revenueTrend = [
  { month: "Apr", revenue: 420000 }, { month: "May", revenue: 435000 }, { month: "Jun", revenue: 410000 },
  { month: "Jul", revenue: 480000 }, { month: "Aug", revenue: 510000 }, { month: "Sep", revenue: 490000 },
  { month: "Oct", revenue: 540000 }, { month: "Nov", revenue: 520000 }, { month: "Dec", revenue: 460000 },
  { month: "Jan", revenue: 560000 }, { month: "Feb", revenue: 580000 }, { month: "Mar", revenue: 620000 },
];

export default function AnalyticsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Analytics & AI Insights</h1>
      <p className="text-sm text-muted-foreground mb-8">Platform-wide intelligence across all schools</p>

      {/* AI Insights */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-primary" /> AI Insights</h2>
        <div className="space-y-3">
          {AI_INSIGHTS.map((ins, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg text-sm ${ins.type === "warning" ? "bg-orange-50 border border-orange-200" : "bg-blue-50 border border-blue-200"}`}>
              <AlertCircle size={15} className={ins.type === "warning" ? "text-orange-500 mt-0.5 flex-shrink-0" : "text-blue-500 mt-0.5 flex-shrink-0"} />
              <span className={ins.type === "warning" ? "text-orange-800" : "text-blue-800"}>{ins.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trend */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Users size={15} /> Student Enrollment Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={enrollmentTrend}>
              <defs>
                <linearGradient id="studentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="students" stroke="#3b82f6" fill="url(#studentGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><DollarSign size={15} /> Platform Revenue Trend (₹)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => `₹${v.toLocaleString()}`} />
              <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="url(#revenueGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
