"use client";
/**
 * Student Discipline Module
 */
import { useState } from "react";

const MOCK_INCIDENTS = [
  { id: "d1", studentName: "Karan Mehta", class: "X-A", type: "Bullying", action: "DETENTION", date: "2026-04-15", parentNotified: true, principalApproved: false, serialOffender: false },
  { id: "d2", studentName: "Sneha Reddy", class: "IX-B", type: "Mobile Phone Usage", action: "WARNING", date: "2026-04-18", parentNotified: true, principalApproved: false, serialOffender: false },
  { id: "d3", studentName: "Amit Sharma", class: "XI-C", type: "Absenteeism", action: "SUSPENSION", date: "2026-04-10", parentNotified: true, principalApproved: true, serialOffender: true },
];

const actionColor: Record<string, string> = {
  WARNING: "bg-yellow-100 text-yellow-700",
  DETENTION: "bg-orange-100 text-orange-700",
  SUSPENSION: "bg-red-100 text-red-700",
  EXPULSION: "bg-red-200 text-red-900",
};

export default function DisciplinePage() {
  const [incidents] = useState(MOCK_INCIDENTS);
  const serialOffenders = incidents.filter(i => i.serialOffender).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Discipline</h1>
          <p className="text-sm text-muted-foreground mt-1">Incident log, escalation workflow, appeal management</p>
        </div>
        <button className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700">Log Incident</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-foreground">{incidents.length}</div>
          <div className="text-sm text-muted-foreground mt-1">Total Incidents (Term)</div>
        </div>
        <div className={`border rounded-xl p-4 ${serialOffenders > 0 ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
          <div className={`text-2xl font-bold ${serialOffenders > 0 ? "text-red-600" : "text-foreground"}`}>{serialOffenders}</div>
          <div className="text-sm text-muted-foreground mt-1">Serial Offenders</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-orange-600">{incidents.filter(i => i.action === "SUSPENSION").length}</div>
          <div className="text-sm text-muted-foreground mt-1">Suspensions</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-green-600">{incidents.filter(i => i.parentNotified).length}</div>
          <div className="text-sm text-muted-foreground mt-1">Parents Notified</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Student</th>
              <th className="px-5 py-3 text-left">Incident Type</th>
              <th className="px-5 py-3 text-left">Date</th>
              <th className="px-5 py-3 text-center">Action</th>
              <th className="px-5 py-3 text-center">Parent</th>
              <th className="px-5 py-3 text-center">Principal</th>
              <th className="px-5 py-3 text-center">Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {incidents.map(inc => (
              <tr key={inc.id} className={`hover:bg-muted ${inc.serialOffender ? "bg-red-50/40" : ""}`}>
                <td className="px-5 py-3">
                  <div className="font-medium text-foreground">{inc.studentName}</div>
                  <div className="text-xs text-muted-foreground">{inc.class}</div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{inc.type}</td>
                <td className="px-5 py-3 text-muted-foreground">{inc.date}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor[inc.action]}`}>{inc.action}</span>
                </td>
                <td className="px-5 py-3 text-center">{inc.parentNotified ? "✅" : "⏳"}</td>
                <td className="px-5 py-3 text-center">
                  {inc.action === "SUSPENSION" || inc.action === "EXPULSION"
                    ? inc.principalApproved ? "✅" : <span className="text-orange-500 text-xs">Pending</span>
                    : <span className="text-muted-foreground text-xs">N/A</span>}
                </td>
                <td className="px-5 py-3 text-center">
                  {inc.serialOffender && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">🚨 Serial</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
