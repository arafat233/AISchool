"use client";
/**
 * International School Module Dashboard
 * IB programmes, Cambridge, Foreign students, Apostille
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface IbStudent {
  name: string;
  programme: string;
  class: string;
  casHours: { creativity: number; activity: number; service: number };
  predictedTotal: number;
}

interface ExpiringDoc {
  name: string;
  nationality: string;
  daysLeft: number;
  type: string;
  expiryDate: string;
}

const casRequired = { creativity: 50, activity: 50, service: 50 };

export default function InternationalPage() {
  const [activeTab, setActiveTab] = useState<"ib" | "foreign" | "apostille">("ib");

  const { data: ibStudents = [], isLoading: loadingIb, error: ibError } = useQuery<IbStudent[]>({
    queryKey: ["international-students"],
    queryFn: async () => {
      const res = await api.get("/student/international");
      return res.data?.data ?? [];
    },
  });

  const { data: expiringDocs = [], isLoading: loadingDocs, error: docsError } = useQuery<ExpiringDoc[]>({
    queryKey: ["international-expiring-docs"],
    queryFn: async () => {
      const res = await api.get("/student/international/expiring-docs");
      return res.data?.data ?? [];
    },
  });

  const isLoading = loadingIb || loadingDocs;
  const hasError = ibError || docsError;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
  if (hasError) return (
    <div className="p-4 text-red-500">Failed to load data. Please try again.</div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">International School Modules</h1>
          <p className="text-sm text-muted-foreground mt-1">IB PYP/MYP/DP · Cambridge IGCSE/A-Level · Foreign Students</p>
        </div>
      </div>

      {expiringDocs.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="font-medium text-orange-800 mb-2">Document Expiry Alerts</div>
          <div className="space-y-1">
            {expiringDocs.map(doc => (
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
          {ibStudents.filter(s => s.programme === "DP").length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No IB DP students found</div>
          ) : (
            <div className="space-y-3">
              {ibStudents.filter(s => s.programme === "DP").map(student => {
                const total = student.casHours.creativity + student.casHours.activity + student.casHours.service;
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
          )}
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
              {expiringDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground text-sm">No foreign students with expiring documents</td>
                </tr>
              ) : expiringDocs.map(doc => (
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
          <div className="font-medium">Apostille &amp; Document Legalisation</div>
          <p className="text-sm mt-2">Track MEA submission, courier, and document return</p>
          <button className="mt-4 px-6 py-2 bg-gray-800 text-white rounded-lg text-sm">New Apostille Request</button>
        </div>
      )}
    </div>
  );
}
