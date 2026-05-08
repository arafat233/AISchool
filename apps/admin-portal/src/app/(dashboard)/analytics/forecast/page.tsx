"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface MonthForecast {
  month: string;
  base_rs: number;
  best_rs: number;
  worst_rs: number;
  actual_rs?: number;
}

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function FinancialForecastPage() {
  const [scenario, setScenario] = useState<"base" | "best" | "worst">("base");

  const { data: forecasts = [], isLoading, error } = useQuery<MonthForecast[]>({
    queryKey: ["financial-forecast"],
    queryFn: async () => {
      const res = await api.get("/ai/predict/financial-forecast", { params: { months: 6 } });
      return res.data?.forecasts ?? res.data?.data ?? [];
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
  if (error) return (
    <div className="p-4 text-red-500">Failed to load data. Please try again.</div>
  );

  const key = `${scenario}_rs` as keyof MonthForecast;
  const totalForecast = forecasts.reduce((s, m) => s + ((m[key] as number) ?? 0), 0);
  const maxVal = Math.max(...forecasts.map((m) => m.best_rs), 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Financial Forecast</h1>
        <div className="flex gap-2">
          {(["base", "best", "worst"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                scenario === s
                  ? s === "best" ? "bg-green-600 text-white" : s === "worst" ? "bg-red-600 text-white" : "bg-blue-600 text-white"
                  : "bg-muted text-foreground hover:bg-muted"
              }`}
            >
              {s} Case
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4 col-span-2">
          <p className="text-sm text-muted-foreground mb-1">6-Month Projected Fee Income ({scenario} case)</p>
          <p className="text-3xl font-bold text-foreground">{INR(totalForecast)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">Monthly Average</p>
          <p className="text-3xl font-bold text-foreground">{INR(forecasts.length ? totalForecast / forecasts.length : 0)}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Monthly Projection</h2>
        {forecasts.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground">No forecast data available</div>
        ) : (
          <div className="space-y-3">
            {forecasts.map((m, i) => {
              const val = (m[key] as number) ?? 0;
              const pct = Math.round((val / maxVal) * 100);
              const barColor = scenario === "best" ? "bg-green-500" : scenario === "worst" ? "bg-red-400" : "bg-blue-500";
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-20 flex-shrink-0">{m.month}</span>
                  <div className="flex-1 h-7 bg-muted rounded-full overflow-hidden relative">
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
