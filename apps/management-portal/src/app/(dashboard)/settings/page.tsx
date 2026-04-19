"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Filter, RefreshCcw, Shield, CreditCard, ChevronDown, ChevronUp } from "lucide-react";

// ─── Audit Log ────────────────────────────────────────────────────────────────
interface AuditEntry {
  id: string;
  schoolName: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  ip: string;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-purple-100 text-purple-700",
  EXPORT: "bg-orange-100 text-orange-700",
};

// ─── Subscription ─────────────────────────────────────────────────────────────
interface SubRow {
  id: string;
  schoolName: string;
  plan: string;
  status: string;
  studentCount: number;
  monthlyFeesRs: number;
  renewalDate: string;
  apiKeyCount: number;
}

const PLAN_COLORS: Record<string, string> = {
  BASIC: "bg-slate-100 text-slate-600",
  STANDARD: "bg-blue-100 text-blue-700",
  PREMIUM: "bg-purple-100 text-purple-700",
  ENTERPRISE: "bg-yellow-100 text-yellow-700",
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  TRIAL: "bg-teal-100 text-teal-700",
  SUSPENDED: "bg-red-100 text-red-700",
  CHURNED: "bg-slate-100 text-slate-500",
};

// ─── Mock fallbacks ───────────────────────────────────────────────────────────
const MOCK_AUDIT: AuditEntry[] = [
  { id: "1", schoolName: "Sunrise Academy", userEmail: "admin@sunrise.edu", action: "UPDATE", resource: "FeeStructure", resourceId: "fs-001", ip: "103.20.11.5", createdAt: "2026-04-18T10:32:00Z" },
  { id: "2", schoolName: "Greenwood School", userEmail: "hr@greenwood.edu", action: "CREATE", resource: "Staff", resourceId: "st-045", ip: "49.36.12.88", createdAt: "2026-04-18T09:15:00Z" },
  { id: "3", schoolName: "Sunrise Academy", userEmail: "principal@sunrise.edu", action: "EXPORT", resource: "AttendanceReport", resourceId: "rep-2026-04", ip: "103.20.11.5", createdAt: "2026-04-18T08:50:00Z" },
  { id: "4", schoolName: "City Public School", userEmail: "admin@citypublic.edu", action: "DELETE", resource: "Expense", resourceId: "exp-112", ip: "27.56.200.14", createdAt: "2026-04-17T16:22:00Z" },
  { id: "5", schoolName: "Greenwood School", userEmail: "teacher1@greenwood.edu", action: "LOGIN", resource: "Portal", resourceId: "session", ip: "49.36.12.90", createdAt: "2026-04-17T15:00:00Z" },
];

const MOCK_SUBS: SubRow[] = [
  { id: "t-001", schoolName: "Sunrise Academy", plan: "PREMIUM", status: "ACTIVE", studentCount: 850, monthlyFeesRs: 85000, renewalDate: "2027-03-31", apiKeyCount: 2 },
  { id: "t-002", schoolName: "Greenwood School", plan: "STANDARD", status: "ACTIVE", studentCount: 420, monthlyFeesRs: 42000, renewalDate: "2026-12-31", apiKeyCount: 1 },
  { id: "t-003", schoolName: "City Public School", plan: "BASIC", status: "TRIAL", studentCount: 180, monthlyFeesRs: 9000, renewalDate: "2026-05-18", apiKeyCount: 0 },
  { id: "t-004", schoolName: "Heritage Institute", plan: "ENTERPRISE", status: "ACTIVE", studentCount: 1200, monthlyFeesRs: 180000, renewalDate: "2027-06-30", apiKeyCount: 5 },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<"audit" | "subscriptions">("audit");
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterSchool, setFilterSchool] = useState("");
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_SAAS_API_URL ?? "http://localhost:3022";

  useEffect(() => {
    const token = localStorage.getItem("mgmt_token");
    Promise.all([
      axios.get(`${API}/audit`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: MOCK_AUDIT })),
      axios.get(`${API}/tenants?detail=true`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: MOCK_SUBS })),
    ]).then(([a, s]) => {
      setAuditLogs(a.data);
      setSubs(s.data);
    }).finally(() => setLoading(false));
  }, [API]);

  const filteredLogs = auditLogs.filter((l) => {
    if (filterAction && l.action !== filterAction) return false;
    if (filterSchool && !l.schoolName.toLowerCase().includes(filterSchool.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings & Administration</h1>
        <p className="text-sm text-muted-foreground mt-1">Audit logs and subscription management across all schools</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted/40 p-1 rounded-xl w-fit">
        {(["audit", "subscriptions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "audit" ? <Shield size={14} /> : <CreditCard size={14} />}
            {t === "audit" ? "Audit Logs" : "Subscriptions"}
          </button>
        ))}
      </div>

      {loading && <div className="text-muted-foreground">Loading…</div>}

      {/* ── Audit Logs ─────────────────────────────────────────────────────── */}
      {!loading && tab === "audit" && (
        <div>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2 text-sm">
              <Filter size={14} className="text-muted-foreground" />
              <input
                placeholder="Filter by school…"
                value={filterSchool}
                onChange={(e) => setFilterSchool(e.target.value)}
                className="outline-none bg-transparent w-40"
              />
            </div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-white border border-border rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="">All Actions</option>
              {["CREATE", "UPDATE", "DELETE", "LOGIN", "EXPORT"].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <button
              onClick={() => { setFilterAction(""); setFilterSchool(""); }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
            >
              <RefreshCcw size={13} /> Reset
            </button>
            <span className="ml-auto text-sm text-muted-foreground">{filteredLogs.length} entries</span>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Time", "School", "User", "Action", "Resource", "Resource ID", "IP"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No audit entries match the filters</td></tr>
                )}
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 font-medium">{l.schoolName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.userEmail}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[l.action] ?? "bg-slate-100 text-slate-600"}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">{l.resource}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{l.resourceId}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Subscriptions ──────────────────────────────────────────────────── */}
      {!loading && tab === "subscriptions" && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["School", "Plan", "Status", "Students", "Monthly Fee (₹)", "Renewal", "API Keys", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subs.map((s) => {
                const expanded = expandedSub === s.id;
                const renewalDate = new Date(s.renewalDate);
                const daysLeft = Math.ceil((renewalDate.getTime() - Date.now()) / 86_400_000);
                return (
                  <>
                    <tr key={s.id} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3 font-medium">{s.schoolName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[s.plan] ?? "bg-slate-100 text-slate-600"}`}>
                          {s.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{s.studentCount.toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium">₹{s.monthlyFeesRs.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={daysLeft <= 30 ? "text-orange-600 font-semibold" : "text-foreground"}>
                          {renewalDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        {daysLeft <= 30 && <span className="ml-1 text-xs text-orange-500">({daysLeft}d)</span>}
                      </td>
                      <td className="px-4 py-3 text-center">{s.apiKeyCount}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedSub(expanded ? null : s.id)}
                          className="text-muted-foreground hover:text-foreground transition"
                        >
                          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${s.id}-detail`} className="bg-muted/20">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="flex items-center gap-8 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Annual Value</p>
                              <p className="font-semibold">₹{(s.monthlyFeesRs * 12).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Revenue / Student / Month</p>
                              <p className="font-semibold">₹{s.studentCount > 0 ? Math.round(s.monthlyFeesRs / s.studentCount) : 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Renewal Alert</p>
                              <p className={`font-semibold ${daysLeft <= 30 ? "text-orange-600" : "text-green-600"}`}>
                                {daysLeft <= 0 ? "Expired" : daysLeft <= 30 ? `${daysLeft} days left — action needed` : `${daysLeft} days left`}
                              </p>
                            </div>
                            <div className="ml-auto flex gap-2">
                              <button className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition">
                                Change Plan
                              </button>
                              <button className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition">
                                Renew
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
