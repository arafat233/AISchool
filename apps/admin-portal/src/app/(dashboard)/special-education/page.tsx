"use client";
/**
 * Special Education & IEP Dashboard
 */
import { useState } from "react";

const MOCK_CWSN = [
  { id: "s1", name: "Ravi Kumar", class: "VII-A", disability: "LEARNING_DISABILITY", udid: "UD-2024-001", iepStatus: "ACTIVE", lastReview: "2026-01-15", accommodations: ["EXTRA_TIME", "SEPARATE_ROOM"], benefits: ["FREE_BOOKS"] },
  { id: "s2", name: "Priya Singh", class: "V-B", disability: "VISUAL_IMPAIRMENT", udid: "UD-2024-002", iepStatus: "REVIEW_DUE", lastReview: "2025-10-10", accommodations: ["LARGE_PRINT", "READER"], benefits: ["FREE_BOOKS", "TRANSPORT_SUBSIDY"] },
  { id: "s3", name: "Arjun Mehta", class: "IX-A", disability: "AUTISM_SPECTRUM", udid: null, iepStatus: "ACTIVE", lastReview: "2026-02-20", accommodations: ["SEPARATE_ROOM", "EXTRA_TIME"], benefits: ["SCHOLARSHIP"] },
];

const disabilityLabels: Record<string, string> = {
  LEARNING_DISABILITY: "Learning Disability",
  VISUAL_IMPAIRMENT: "Visual Impairment",
  HEARING_IMPAIRMENT: "Hearing Impairment",
  LOCOMOTOR_DISABILITY: "Locomotor Disability",
  INTELLECTUAL_DISABILITY: "Intellectual Disability",
  AUTISM_SPECTRUM: "Autism Spectrum",
  SPEECH_LANGUAGE: "Speech & Language",
  MULTIPLE_DISABILITIES: "Multiple Disabilities",
};

export default function SpecialEducationPage() {
  const [students] = useState(MOCK_CWSN);
  const reviewDue = students.filter(s => s.iepStatus === "REVIEW_DUE").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Special Education & IEP</h1>
          <p className="text-sm text-muted-foreground mt-1">CWSN student profiles, Individualised Education Plans, exam accommodations</p>
        </div>
        <button className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700">Compliance Report</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-600">{students.length}</div>
          <div className="text-sm text-muted-foreground mt-1">CWSN Students</div>
        </div>
        <div className={`border rounded-xl p-4 ${reviewDue > 0 ? "bg-orange-50 border-orange-200" : "bg-card border-border"}`}>
          <div className={`text-2xl font-bold ${reviewDue > 0 ? "text-orange-600" : "text-foreground"}`}>{reviewDue}</div>
          <div className="text-sm text-muted-foreground mt-1">IEP Reviews Due</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-green-600">{students.filter(s => s.udid).length}</div>
          <div className="text-sm text-muted-foreground mt-1">UDID Registered</div>
        </div>
      </div>

      <div className="space-y-3">
        {students.map(student => (
          <div key={student.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-foreground">{student.name}</div>
                  <span className="text-xs text-muted-foreground">{student.class}</span>
                  {!student.udid && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">UDID Pending</span>}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{disabilityLabels[student.disability] ?? student.disability}</div>
                {student.udid && <div className="text-xs text-muted-foreground mt-0.5">UDID: {student.udid}</div>}
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${student.iepStatus === "REVIEW_DUE" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                  IEP: {student.iepStatus.replace("_", " ")}
                </span>
                <div className="text-xs text-muted-foreground mt-1">Last review: {student.lastReview}</div>
              </div>
            </div>

            <div className="mt-3 flex gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Exam Accommodations</div>
                <div className="flex gap-1 flex-wrap">
                  {student.accommodations.map(acc => (
                    <span key={acc} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{acc.replace("_", " ")}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Government Benefits</div>
                <div className="flex gap-1 flex-wrap">
                  {student.benefits.map(b => (
                    <span key={b} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{b.replace("_", " ")}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button className="text-xs px-3 py-1 border border-border rounded-md hover:bg-muted">View IEP</button>
              {student.iepStatus === "REVIEW_DUE" && (
                <button className="text-xs px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700">Start Review</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
