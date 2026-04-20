"use client";
/**
 * Student Insurance Management
 */
import { useState } from "react";

const MOCK_POLICY = {
  insurer: "New India Assurance Co.",
  policyNumber: "NIA-GRP-2025-8842",
  sumAssuredRs: 100000,
  premiumPerStudentRs: 280,
  coverageStart: "2025-06-01",
  coverageEnd: "2026-05-31",
  coverageDetails: "Personal accident + hospitalisation cover for all enrolled students",
  daysToExpiry: 41,
  totalStudentsCovered: 1240,
};

const MOCK_CLAIMS = [
  { ref: "CLAIM-1001", studentName: "Rohit Saha", class: "VIII-A", accidentDate: "2026-02-10", claimAmountRs: 45000, status: "SETTLED", settlementRs: 42000 },
  { ref: "CLAIM-1002", studentName: "Ananya Bose", class: "X-B", accidentDate: "2026-03-22", claimAmountRs: 18000, status: "UNDER_REVIEW", settlementRs: null },
  { ref: "CLAIM-1003", studentName: "Vijay Kumar", class: "XII-A", accidentDate: "2026-04-01", claimAmountRs: 32000, status: "FILED", settlementRs: null },
];

const statusColor: Record<string, string> = {
  FILED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  SETTLED: "bg-gray-100 text-gray-700",
};

export default function InsurancePage() {
  const [claims] = useState(MOCK_CLAIMS);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Insurance</h1>
          <p className="text-sm text-gray-500 mt-1">Group accident insurance policy, claims management</p>
        </div>
        <button className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700">File Claim</button>
      </div>

      {/* Policy Card */}
      <div className={`border rounded-xl p-5 ${MOCK_POLICY.daysToExpiry <= 60 ? "bg-orange-50 border-orange-200" : "bg-white border-gray-200"}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold text-gray-900 text-lg">{MOCK_POLICY.insurer}</div>
            <div className="text-sm text-gray-500 mt-0.5">Policy No: {MOCK_POLICY.policyNumber}</div>
            <div className="text-sm text-gray-600 mt-2">{MOCK_POLICY.coverageDetails}</div>
          </div>
          <div className="text-right">
            {MOCK_POLICY.daysToExpiry <= 60 && (
              <div className="bg-orange-100 text-orange-700 text-sm px-3 py-1 rounded-lg font-medium mb-2">
                ⚠️ Expires in {MOCK_POLICY.daysToExpiry} days
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
          <div>
            <div className="text-xs text-gray-500">Sum Assured</div>
            <div className="font-bold text-gray-900">₹{MOCK_POLICY.sumAssuredRs.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Premium/Student</div>
            <div className="font-bold text-gray-900">₹{MOCK_POLICY.premiumPerStudentRs}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Coverage Period</div>
            <div className="font-bold text-gray-900">{MOCK_POLICY.coverageStart} → {MOCK_POLICY.coverageEnd}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Students Covered</div>
            <div className="font-bold text-gray-900">{MOCK_POLICY.totalStudentsCovered.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Claims ({claims.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Reference</th>
              <th className="px-5 py-3 text-left">Student</th>
              <th className="px-5 py-3 text-left">Accident Date</th>
              <th className="px-5 py-3 text-right">Claimed (₹)</th>
              <th className="px-5 py-3 text-right">Settlement (₹)</th>
              <th className="px-5 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {claims.map(claim => (
              <tr key={claim.ref} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-xs text-gray-600">{claim.ref}</td>
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{claim.studentName}</div>
                  <div className="text-xs text-gray-400">{claim.class}</div>
                </td>
                <td className="px-5 py-3 text-gray-600">{claim.accidentDate}</td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">₹{claim.claimAmountRs.toLocaleString()}</td>
                <td className="px-5 py-3 text-right text-gray-600">{claim.settlementRs ? `₹${claim.settlementRs.toLocaleString()}` : "—"}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[claim.status]}`}>{claim.status.replace("_", " ")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
