"use client";
/**
 * Monthly IoT Sensor Report
 * Average air quality, energy consumption trend per classroom
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface MonthlyReport {
  location: string;
  month: string;
  avg_co2: number;
  avg_pm25: number;
  total_kwh: number;
  total_liters: number;
  co2_exceedances: number;   // days CO2 exceeded threshold
  pm25_exceedances: number;
}

const co2Quality = (ppm: number) => {
  if (ppm === 0) return null;
  if (ppm < 600) return { label: "Excellent", color: "text-green-700 bg-green-50" };
  if (ppm < 800) return { label: "Good", color: "text-blue-700 bg-blue-50" };
  if (ppm < 1000) return { label: "Moderate", color: "text-yellow-700 bg-yellow-50" };
  return { label: "Poor", color: "text-red-700 bg-red-50" };
};

export default function IotReportPage() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const { data: report = [], isLoading, error } = useQuery<MonthlyReport[]>({
    queryKey: ["iot-reports", month],
    queryFn: async () => {
      const res = await api.get("/iot/reports", { params: { month } });
      return res.data?.data ?? [];
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

  const airQualityRows = report.filter(r => r.avg_co2 > 0);
  const energyRows = report.filter(r => r.total_kwh > 0);
  const waterRows = report.filter(r => r.total_liters > 0);

  const totalKwh = energyRows.reduce((s, r) => s + r.total_kwh, 0);
  const totalLiters = waterRows.reduce((s, r) => s + r.total_liters, 0);
  const avgCo2 = airQualityRows.reduce((s, r) => s + r.avg_co2, 0) / (airQualityRows.length || 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monthly IoT Sensor Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Air quality, energy, and water consumption by location</p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border border-input rounded-lg px-3 py-2 text-sm" />
          <button className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700">Export PDF</button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground">Avg CO₂ (across all rooms)</div>
          <div className="text-3xl font-bold text-foreground mt-1">{avgCo2.toFixed(0)} <span className="text-lg font-normal text-muted-foreground">ppm</span></div>
          <div className={`text-xs mt-2 px-2 py-0.5 rounded-full inline-block ${co2Quality(avgCo2)?.color}`}>{co2Quality(avgCo2)?.label}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground">Total Electricity</div>
          <div className="text-3xl font-bold text-foreground mt-1">{totalKwh.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">kWh</span></div>
          <div className="text-xs text-muted-foreground mt-2">≈ ₹{(totalKwh * 8).toLocaleString()} at ₹8/unit</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground">Total Water</div>
          <div className="text-3xl font-bold text-foreground mt-1">{(totalLiters / 1000).toFixed(1)} <span className="text-lg font-normal text-muted-foreground">kL</span></div>
          <div className="text-xs text-muted-foreground mt-2">{totalLiters.toLocaleString()} litres total</div>
        </div>
      </div>

      {/* Air Quality Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Air Quality by Classroom</h2>
        </div>
        {airQualityRows.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">No air quality data for this month</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Location</th>
                <th className="px-5 py-3 text-right">Avg CO₂ (ppm)</th>
                <th className="px-5 py-3 text-right">Avg PM2.5 (µg/m³)</th>
                <th className="px-5 py-3 text-right">CO₂ Exceedances</th>
                <th className="px-5 py-3 text-right">PM2.5 Exceedances</th>
                <th className="px-5 py-3 text-center">Air Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {airQualityRows.map(row => {
                const quality = co2Quality(row.avg_co2);
                return (
                  <tr key={row.location} className="hover:bg-muted">
                    <td className="px-5 py-3 font-medium text-foreground">{row.location}</td>
                    <td className="px-5 py-3 text-right text-foreground">{row.avg_co2}</td>
                    <td className="px-5 py-3 text-right text-foreground">{row.avg_pm25}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={row.co2_exceedances > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>{row.co2_exceedances} days</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={row.pm25_exceedances > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>{row.pm25_exceedances} days</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${quality?.color}`}>{quality?.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Energy Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Energy Consumption by Block</h2>
        </div>
        {energyRows.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">No energy data for this month</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Location</th>
                <th className="px-5 py-3 text-right">Total kWh</th>
                <th className="px-5 py-3 text-right">Est. Cost (₹)</th>
                <th className="px-5 py-3 text-right">Daily Avg (kWh)</th>
                <th className="px-5 py-3 text-right">Water (L)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {energyRows.sort((a, b) => b.total_kwh - a.total_kwh).map(row => (
                <tr key={row.location} className="hover:bg-muted">
                  <td className="px-5 py-3 font-medium text-foreground">{row.location}</td>
                  <td className="px-5 py-3 text-right text-foreground">{row.total_kwh.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-foreground">₹{(row.total_kwh * 8).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground">{(row.total_kwh / 30).toFixed(1)}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground">{row.total_liters > 0 ? row.total_liters.toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted font-semibold text-foreground">
              <tr>
                <td className="px-5 py-3">Total</td>
                <td className="px-5 py-3 text-right">{totalKwh.toLocaleString()}</td>
                <td className="px-5 py-3 text-right">₹{(totalKwh * 8).toLocaleString()}</td>
                <td className="px-5 py-3 text-right">{(totalKwh / 30).toFixed(1)}</td>
                <td className="px-5 py-3 text-right">{totalLiters.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
