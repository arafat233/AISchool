"use client";
/**
 * Feature Management Console
 * Enable/disable features, manage rollout stages, A/B testing, beta program
 */
import { useState } from "react";

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPct: 0 | 5 | 20 | 50 | 100;
  betaOnly: boolean;
  abVariant?: "A" | "B";
  killSwitchActive: boolean;
  updatedAt: string;
}

const MOCK_FLAGS: FeatureFlag[] = [
  { key: "BLOCKCHAIN_CERTS", name: "Blockchain Certificates", description: "Issue certificates with on-chain hash verification via Polygon", enabled: true, rolloutPct: 20, betaOnly: false, killSwitchActive: false, updatedAt: "2026-04-10" },
  { key: "IOT_DASHBOARD", name: "IoT Sensor Dashboard", description: "Building health monitoring with air quality, energy & water sensors", enabled: true, rolloutPct: 50, betaOnly: true, killSwitchActive: false, updatedAt: "2026-04-12" },
  { key: "AI_TIMETABLE", name: "AI-Powered Timetable", description: "Automated timetable generation using constraint-based optimization", enabled: true, rolloutPct: 100, betaOnly: false, killSwitchActive: false, updatedAt: "2026-03-28" },
  { key: "PARENT_WALLET", name: "Parent Digital Wallet", description: "Pre-loaded wallet for canteen and activity payments", enabled: false, rolloutPct: 0, betaOnly: true, killSwitchActive: false, updatedAt: "2026-04-01" },
  { key: "VIDEO_ASSIGNMENTS", name: "Video Assignments", description: "Students submit video answers for assignments; teacher reviews in-app", enabled: true, rolloutPct: 5, betaOnly: true, killSwitchActive: false, updatedAt: "2026-04-15" },
  { key: "MDM_LESSON_MODE", name: "MDM Lesson Mode", description: "Lock student devices to approved apps during class", enabled: true, rolloutPct: 20, betaOnly: false, killSwitchActive: false, updatedAt: "2026-04-14" },
];

const ROLLOUT_STAGES: (0 | 5 | 20 | 50 | 100)[] = [0, 5, 20, 50, 100];

const rolloutColor = (pct: number, enabled: boolean, killed: boolean) => {
  if (killed) return "text-red-600 bg-red-50";
  if (!enabled || pct === 0) return "text-muted-foreground bg-muted";
  if (pct < 20) return "text-yellow-700 bg-yellow-50";
  if (pct < 100) return "text-blue-700 bg-blue-50";
  return "text-green-700 bg-green-50";
};

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>(MOCK_FLAGS);
  const [saved, setSaved] = useState<string | null>(null);

  const toggleEnabled = (key: string) => {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
  };

  const setRollout = (key: string, pct: 0 | 5 | 20 | 50 | 100) => {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, rolloutPct: pct } : f));
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  };

  const toggleKillSwitch = (key: string) => {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, killSwitchActive: !f.killSwitchActive } : f));
  };

  const totalActive = flags.filter(f => f.enabled && !f.killSwitchActive).length;
  const betaOnly = flags.filter(f => f.betaOnly).length;
  const fullRollout = flags.filter(f => f.rolloutPct === 100 && f.enabled).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Feature Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Control feature rollout per tenant without redeployment</p>
        </div>
        <a href="/feature-flags/beta" className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700">
          Beta Program
        </a>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-green-600">{totalActive}</div>
          <div className="text-sm text-muted-foreground mt-1">Active Features</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-purple-600">{betaOnly}</div>
          <div className="text-sm text-muted-foreground mt-1">Beta-Only Features</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-600">{fullRollout}</div>
          <div className="text-sm text-muted-foreground mt-1">Full Rollout (100%)</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Feature</th>
              <th className="px-5 py-3 text-center">Enabled</th>
              <th className="px-5 py-3 text-center">Rollout</th>
              <th className="px-5 py-3 text-center">Stage</th>
              <th className="px-5 py-3 text-center">Beta</th>
              <th className="px-5 py-3 text-center">Kill Switch</th>
              <th className="px-5 py-3 text-right">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {flags.map(flag => (
              <tr key={flag.key} className={`hover:bg-muted ${flag.killSwitchActive ? "bg-red-50" : ""}`}>
                <td className="px-5 py-4">
                  <div className="font-medium text-foreground">{flag.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono">{flag.key}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{flag.description}</div>
                </td>
                <td className="px-5 py-4 text-center">
                  <button
                    onClick={() => toggleEnabled(flag.key)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${flag.enabled ? "bg-green-500" : "bg-gray-300"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${flag.enabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </td>
                <td className="px-5 py-4 text-center">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${rolloutColor(flag.rolloutPct, flag.enabled, flag.killSwitchActive)}`}>
                    {flag.killSwitchActive ? "KILLED" : `${flag.rolloutPct}%`}
                  </span>
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex gap-1 justify-center">
                    {ROLLOUT_STAGES.map(stage => (
                      <button
                        key={stage}
                        onClick={() => setRollout(flag.key, stage)}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                          flag.rolloutPct === stage
                            ? "bg-gray-800 text-white border-gray-800"
                            : "text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {stage}%
                      </button>
                    ))}
                  </div>
                  {saved === flag.key && <div className="text-xs text-green-600 mt-1">Saved</div>}
                </td>
                <td className="px-5 py-4 text-center">
                  {flag.betaOnly && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">Beta</span>
                  )}
                </td>
                <td className="px-5 py-4 text-center">
                  <button
                    onClick={() => toggleKillSwitch(flag.key)}
                    title={flag.killSwitchActive ? "Deactivate kill switch" : "Activate kill switch (emergency stop)"}
                    className={`text-xs px-3 py-1 rounded border font-medium transition-colors ${
                      flag.killSwitchActive
                        ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                        : "text-red-500 border-red-200 hover:bg-red-50"
                    }`}
                  >
                    {flag.killSwitchActive ? "ACTIVE" : "Activate"}
                  </button>
                </td>
                <td className="px-5 py-4 text-right text-muted-foreground text-xs">{flag.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Gradual rollout:</strong> Use 5% → 20% → 50% → 100% stages. Each tenant is deterministically hashed to a 1–100 bucket, so rollout is consistent and reproducible. Beta schools receive new features first regardless of rollout percentage. Kill switch instantly disables the feature for all tenants and triggers an engineering alert.
      </div>
    </div>
  );
}
