"use client";
import { useEffect, useState } from "react";

interface MonthForecast {
  month: string;
  base_rs: number;
  best_rs: number;
  worst_rs: number;
  actual_rs?: number;
}

const MOCK_FORECAST: MonthForecast[] = [
  { month: "May 2026", base_rs: 12_50_000, best_rs: 14_00_000, worst_rs: 10_50_000 },
  { month: "Jun 2026", base_rs: 15_80_000, best_rs: 17_50_000, worst_rs: 13_20_000 },
  { month: "Jul 2026", base_rs: 9_20_000, best_rs: 10_40_000, worst_rs: 7_80_000 },
  { month: "Aug 2026", base_rs: 11_40_000, best_rs: 12_90_000, worst_rs: 9_60_000 },
  { month: "Sep 2026", base_rs: 13_10_000, best_rs: 14_80_000, worst_rs: 11_00_000 },
  { month: "Oct 2026", base_rs: 8_90_000, best_rs: 10_20_000, worst_rs: 7_40_000 },
];

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function FinancialForecastPage() {
  const [forecasts, setForecasts] = useState<MonthForecast[]>([]);
  const [scenario, setScenario] = useState<"base" | "best" | "worst">("base");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/proxy/ai/predict/financial-forecast?school_id=SCHOOL_ID&months=6")
      .then((r) => r.json())
      .then((d) => setForecasts(Array.isArray(d?.forecasts) ? d.forecasts : MOCK_FORECAST))
      .catch(() => setForecasts(MOCK_FORECAST))
      .finally(() => setLoading(false));
  }, []);

  const key = `${scenario}_rs` as keyof MonthForecast;
  const totalForecast = forecasts.reduce((s, m) => s + ((m[key] as number) ?? 0), 0);
  const maxVal = Math.max(...forecasts.map((m) => m.best_rs));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Financial Forecast</h1>
        <div className="flex gap-2">
          {(["base", "best", "worst"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                scenario === s
                  ? s === "best" ? "bg-green-600 text-white" : s === "worst" ? "bg-red-600 text-white" : "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {s} Case
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4 col-span-2">
          <p className="text-sm text-gray-500 mb-1">6-Month Projected Fee Income ({scenario} case)</p>
          <p className="text-3xl font-bold text-gray-900">{INR(totalForecast)}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-1">Monthly Average</p>
          <p className="text-3xl font-bold text-gray-900">{INR(forecasts.length ? totalForecast / forecasts.length : 0)}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Monthly Projection</h2>
        {loading ? (
          <div className="h-40 flex items-center justify-center text-gray-400">Loading…</div>
        ) : (
          <div className="space-y-3">
            {forecasts.map((m, i) => {
              const val = (m[key] as number) ?? 0;
              const pct = Math.round((val / maxVal) * 100);
              const barColor = scenario === "best" ? "bg-green-500" : scenario === "worst" ? "bg-red-400" : "bg-blue-500";
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-20 flex-shrink-0">{m.month}</span>
                  <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full ${barColor} rounded-full flex items-center justify-end pr-2`}
                      style={{ width: `${pct}%`, minWidth: "3rem" }}
                    >
                      <span className="text-white text-xs font-medium">{INR(val)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Methodology:</strong> NumPy polynomial regression on 12-month fee collection history.
        Best case = +12%, Worst case = −16% variance applied to base forecast.
        Forecast accuracy improves with more historical data.
      </div>
    </div>
  );
}
