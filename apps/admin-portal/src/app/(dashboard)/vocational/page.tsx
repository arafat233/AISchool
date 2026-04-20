"use client";
/**
 * Vocational Education & NEP 2020 Dashboard
 */
import { useState } from "react";

const MOCK_SUBJECTS = [
  { name: "Information Technology", sector: "IT-ITeS", nsqfLevel: 4, enrolledStudents: 48, ojtPartner: "Infosys BPM Ltd", ojtHrsReq: 120, avgOjtCompleted: 84 },
  { name: "Beauty & Wellness", sector: "Beauty & Wellness", nsqfLevel: 3, enrolledStudents: 32, ojtPartner: "VLCC Institute", ojtHrsReq: 80, avgOjtCompleted: 75 },
  { name: "Healthcare", sector: "Healthcare", nsqfLevel: 4, enrolledStudents: 24, ojtPartner: "Apollo Clinic", ojtHrsReq: 160, avgOjtCompleted: 48 },
];

const FLN_DATA = [
  { class: "Grade 1", total: 42, readingAtGrade: 28, readingBelow: 14, numeracyAtGrade: 32, numeracyBelow: 10 },
  { class: "Grade 2", total: 38, readingAtGrade: 30, readingBelow: 8, numeracyAtGrade: 34, numeracyBelow: 4 },
  { class: "Grade 3", total: 40, readingAtGrade: 36, readingBelow: 4, numeracyAtGrade: 37, numeracyBelow: 3 },
];

export default function VocationalPage() {
  const [activeTab, setActiveTab] = useState<"vocational" | "nep" | "fln">("vocational");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vocational Education & NEP 2020</h1>
          <p className="text-sm text-gray-500 mt-1">NSQF competency framework · Industry OJT · FLN dashboard</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {(["vocational", "nep", "fln"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === tab ? "border-gray-800 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {tab === "vocational" ? "Vocational Subjects" : tab === "nep" ? "NEP Competencies" : "FLN Dashboard (Gr 1–3)"}
          </button>
        ))}
      </div>

      {activeTab === "vocational" && (
        <div className="space-y-4">
          {MOCK_SUBJECTS.map(sub => (
            <div key={sub.name} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-semibold text-gray-900">{sub.name}</div>
                  <div className="text-sm text-gray-500">{sub.sector} · NSQF Level {sub.nsqfLevel}</div>
                  <div className="text-xs text-gray-400 mt-0.5">OJT Partner: {sub.ojtPartner}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{sub.enrolledStudents}</div>
                  <div className="text-xs text-gray-400">enrolled</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>OJT Progress (avg)</span>
                  <span>{sub.avgOjtCompleted}/{sub.ojtHrsReq} hrs</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${sub.avgOjtCompleted >= sub.ojtHrsReq ? "bg-green-500" : "bg-blue-500"}`}
                    style={{ width: `${Math.min(100, (sub.avgOjtCompleted / sub.ojtHrsReq) * 100)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "fln" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Foundational Literacy & Numeracy (Grades 1–3)</h2>
            <p className="text-sm text-gray-500 mt-0.5">NEP 2020 mandate: All children achieve FLN competency by Grade 3</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Class</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">Reading: Grade Level</th>
                <th className="px-5 py-3 text-right">Reading: Below</th>
                <th className="px-5 py-3 text-right">Numeracy: Grade Level</th>
                <th className="px-5 py-3 text-right">Numeracy: Below</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {FLN_DATA.map(row => (
                <tr key={row.class} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{row.class}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{row.total}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-green-700 font-medium">{row.readingAtGrade}</span>
                    <span className="text-gray-400 text-xs ml-1">({Math.round(row.readingAtGrade * 100 / row.total)}%)</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-medium ${row.readingBelow > 0 ? "text-red-600" : "text-gray-400"}`}>{row.readingBelow}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-green-700 font-medium">{row.numeracyAtGrade}</span>
                    <span className="text-gray-400 text-xs ml-1">({Math.round(row.numeracyAtGrade * 100 / row.total)}%)</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-medium ${row.numeracyBelow > 0 ? "text-red-600" : "text-gray-400"}`}>{row.numeracyBelow}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "nep" && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-3">📊</div>
          <div className="font-medium">NEP 2020 Competency Framework</div>
          <p className="text-sm mt-2">Map lessons to NCERT learning outcomes, track competency-based progress</p>
        </div>
      )}
    </div>
  );
}
