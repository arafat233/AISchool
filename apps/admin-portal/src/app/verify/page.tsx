"use client";
/**
 * Public certificate verification page — no auth required.
 * URL: /verify?id=CERT-2025-12345  OR  /verify?hash=0xabc...
 *
 * Calls GET /api/public/verify-certificate which queries the blockchain.
 */
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

type VerifyStatus = "idle" | "loading" | "valid" | "revoked" | "not_found" | "error";

export default function VerifyCertificatePage() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState(searchParams.get("id") ?? searchParams.get("hash") ?? "");
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const id = searchParams.get("id") ?? searchParams.get("hash");
    if (id) {
      setInput(id);
      verify(id);
    }
  }, []);

  async function verify(value?: string) {
    const query = (value ?? input).trim();
    if (!query) return;
    setStatus("loading");
    try {
      const isHash = query.startsWith("0x");
      const url = isHash
        ? `/api/public/verify-certificate?hash=${encodeURIComponent(query)}`
        : `/api/public/verify-certificate?id=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.found) {
        setStatus("not_found");
      } else if (data.revoked) {
        setStatus("revoked");
        setResult(data);
      } else {
        setStatus("valid");
        setResult(data);
      }
    } catch {
      setStatus("error");
    }
  }

  const STATUS_CONFIG = {
    valid: { icon: "✅", label: "VALID", color: "text-green-700", bg: "bg-green-50 border-green-200" },
    revoked: { icon: "❌", label: "REVOKED", color: "text-red-700", bg: "bg-red-50 border-red-200" },
    not_found: { icon: "❓", label: "NOT FOUND", color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
    error: { icon: "⚠️", label: "ERROR", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
    loading: { icon: "⏳", label: "VERIFYING…", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
    idle: { icon: "", label: "", color: "", bg: "" },
  };

  const cfg = STATUS_CONFIG[status];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Certificate Verification</h1>
          <p className="text-gray-500 mt-2">Enter a certificate ID or hash to verify authenticity via blockchain</p>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Certificate ID (e.g. CERT-2025-12345) or 0x hash"
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && verify()}
          />
          <button
            onClick={() => verify()}
            disabled={!input.trim() || status === "loading"}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {status === "loading" ? "Verifying on blockchain…" : "Verify Certificate"}
          </button>
        </div>

        {status !== "idle" && (
          <div className={`border rounded-2xl p-6 ${cfg.bg}`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{cfg.icon}</span>
              <div>
                <p className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</p>
                {status === "valid" && <p className="text-sm text-green-600">This certificate is authentic and unrevoked</p>}
                {status === "revoked" && <p className="text-sm text-red-600">This certificate has been revoked</p>}
                {status === "not_found" && <p className="text-sm text-gray-500">No record found on the blockchain</p>}
              </div>
            </div>

            {result && (
              <div className="space-y-2 text-sm mt-4 border-t pt-4">
                {result.schoolName && <div className="flex justify-between"><span className="text-gray-500">School</span><span className="font-medium">{result.schoolName}</span></div>}
                {result.studentName && <div className="flex justify-between"><span className="text-gray-500">Student</span><span className="font-medium">{result.studentName}</span></div>}
                {result.certificateType && <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{result.certificateType}</span></div>}
                {result.issuedAt && <div className="flex justify-between"><span className="text-gray-500">Issued</span><span className="font-medium">{new Date(result.issuedAt).toDateString()}</span></div>}
                {result.certHash && <div className="flex justify-between"><span className="text-gray-500">Hash</span><span className="font-mono text-xs text-gray-600 break-all">{result.certHash.slice(0, 20)}…</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Source</span><span className="font-medium text-purple-700">Polygon Blockchain</span></div>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Powered by Polygon blockchain. Certificate hashes are immutably stored on-chain. This page requires no login.
        </p>
      </div>
    </div>
  );
}
