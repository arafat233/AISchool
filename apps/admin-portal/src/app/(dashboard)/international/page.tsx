"use client";
/**
 * International School Module Dashboard
 * IB programmes, Cambridge, Foreign students, Apostille
 */
import { useState } from "react";

const MOCK_IB_STUDENTS = [
  { name: "Emma Richardson", programme: "DP", class: "XII", casHours: { creativity: 45, activity: 38, service: 22 }, predictedTotal: 38 },
  { name: "Mohammed Al-Farsi", programme: "DP", class: "XII", casHours: { creativity: 50, activity: 50, service: 50 }, predictedTotal: 42 },
  { name: "Priya Krishnamurthy", programme: "MYP", class: "X", casHours: { creativity: 0, activity: 0, service: 0 }, predictedTotal: 0 },
];

const MOCK_EXPIRING_DOCS = [
  { name: "Yuki Tanaka", nationality: "Japanese", daysLeft: 12, type: "Visa", expiryDate: "2026-05-02" },
  { name: "Sarah Johnson", nationality: "British", daysLeft: 28, type: "Passport", expiryDate: "2026-05-18" },
  { name: "Ahmad Hassan", nationality: "UAE", daysLeft: 45, type: "Visa", expiryDate: "2026-06-04" },
];

const casRequired = { creativity: 50, activity: 50, service: 50 };

export default function InternationalPage() {
  const [activeTab, setActiveTab] = useState<"ib" | "foreign" | "apostille">("ib");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">International School Modules</h1>
          <p className="text-sm text-muted-foreground mt-1">IB PYP/MYP/DP · Cambridge IGCSE/A-Level · Foreign Students</p>
        </div>
      </div>

      {MOCK_EXPIRING_DOCS.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="font-medium text-orange-800 mb-2">Document Expiry Alerts</div>
          <div className="space-y-1">
            {MOCK_EXPIRING_DOCS.map(doc => (
              <div key={doc.name} className="flex items-center justify-between text-sm">
                <span className="text-orange-700">{doc.name} ({doc.nationality})</span>
                <span className={`font-medium ${doc.daysLeft <= 14 ? "text-red-600" : "text-orange-600"}`}>
                  {doc.type} expires {doc.expiryDate} ({doc.daysLeft} days)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        {(["ib", "foreign", "apostille"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === tab ? "border-gray-800 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab === "ib" ? "IB Programmes" : tab === "foreign" ? "Foreign Students" : "Apostille"}
          </button>
        ))}
      </div>

      {activeTab === "ib" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground">IB DP Students — CAS Progress</h2>
          <div className="space-y-3">
            {MOCK_IB_STUDENTS.filter(s => s.programme === "DP").map(student => {
              const total = student.casHours.creativity + student.casHours.activity + student.casHours.service;
              const totalRequired = 150;
              return (
                <div key={student.name} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium text-foreground">{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.programme} · {student.class}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">{total}/150 hrs</div>
                      <div className="text-xs text-muted-foreground">Predicted: {student.predictedTotal} pts</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["creativity", "activity", "service"] as const).map(strand => {
                      const hours = student.casHours[strand];
                      const req = casRequired[strand];
                      return (
                        <div key={strand} className={`rounded-lg p-2 ${hours >= req ? "bg-green-50" : "bg-muted"}`}>
                          <div className="text-xs text-muted-foreground capitalize">{strand}</div>
                          <div className={`font-bold ${hours >= req ? "text-green-700" : "text-foreground"}`}>{hours}/{req} hrs</div>
                          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                            <div className={`h-1.5 rounded-full ${hours >= req ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${Math.min(100, (hours / req) * 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "foreign" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Student</th>
                <th className="px-5 py-3 text-left">Nationality</th>
                <th className="px-5 py-3 text-left">Visa Expiry</th>
                <th className="px-5 py-3 text-left">Passport Expiry</th>
                <th className="px-5 py-3 text-left">Currency</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MOCK_EXPIRING_DOCS.map(doc => (
                <tr key={doc.name} className="hover:bg-muted">
                  <td className="px-5 py-3 font-medium text-foreground">{doc.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{doc.nationality}</td>
                  <td className="px-5 py-3 text-muted-foreground">—</td>
                  <td className="px-5 py-3 text-muted-foreground">—</td>
                  <td className="px-5 py-3 text-muted-foreground">INR</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${doc.daysLeft <= 14 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                      {doc.type} expiring
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "apostille" && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">📋</div>
          <div className="font-medium">Apostille & Document Legalisation</div>
          <p className="text-sm mt-2">Track MEA submission, courier, and document return</p>
          <button className="mt-4 px-6 py-2 bg-gray-800 text-white rounded-lg text-sm">New Apostille Request</button>
        </div>
      )}
    </div>
  );
}
