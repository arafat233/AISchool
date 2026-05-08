"use client";
/**
 * Building Health Live Dashboard
 * Facility manager view: all sensors, all alerts, live status
 */
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface SensorStatus {
  deviceId: string;
  location: string;
  sensorType: "AIR_QUALITY" | "ELECTRICITY" | "WATER" | "OCCUPANCY";
  lastReading: {
    co2_ppm?: number;
    pm25_ugm3?: number;
    temperature_c?: number;
    humidity_pct?: number;
    kwh?: number;
    liters?: number;
    occupied?: boolean;
  };
  lastSeen: string;
  status: "OK" | "WARNING" | "ALERT" | "OFFLINE";
}

interface IoTAlert {
  id: string;
  location: string;
  type: string;
  message: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  triggeredAt: string;
  acknowledged: boolean;
}


const statusColor: Record<string, string> = {
  OK: "bg-green-100 text-green-800",
  WARNING: "bg-yellow-100 text-yellow-800",
  ALERT: "bg-red-100 text-red-800",
  OFFLINE: "bg-muted text-muted-foreground",
};

const severityColor: Record<string, string> = {
  HIGH: "border-l-4 border-red-500 bg-red-50",
  MEDIUM: "border-l-4 border-yellow-500 bg-yellow-50",
  LOW: "border-l-4 border-blue-500 bg-blue-50",
};

export default function IotDashboardPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("ALL");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: sensors = [], isLoading: sensorsLoading, error: sensorsError } = useQuery<SensorStatus[]>({
    queryKey: ["iot-sensors"],
    queryFn: async () => {
      const res = await api.get("/iot/sensors");
      return res.data?.data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: alerts = [], isLoading: alertsLoading, error: alertsError } = useQuery<IoTAlert[]>({
    queryKey: ["iot-alerts"],
    queryFn: async () => {
      const res = await api.get("/iot/alerts");
      return res.data?.data ?? [];
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
      qc.invalidateQueries({ queryKey: ["iot-sensors"] });
      qc.invalidateQueries({ queryKey: ["iot-alerts"] });
    }, 30000);
    return () => clearInterval(interval);
  }, [qc]);

  if (sensorsLoading || alertsLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (sensorsError || alertsError) return <div className="p-4 text-red-500">Failed to load data. Please try again.</div>;

  const filtered = filter === "ALL" ? sensors : sensors.filter(s => s.sensorType === filter || s.status === filter);
  const counts = { OK: sensors.filter(s => s.status === "OK").length, WARNING: sensors.filter(s => s.status === "WARNING").length, ALERT: sensors.filter(s => s.status === "ALERT").length, OFFLINE: sensors.filter(s => s.status === "OFFLINE").length };

  const acknowledgeAlert = async (id: string) => {
    await api.patch(`/iot/alerts/${id}/acknowledge`);
    qc.invalidateQueries({ queryKey: ["iot-alerts"] });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Building Health Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Live sensor data — refreshes every 30s · Last: {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <a href="/iot/thresholds" className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700">
          Configure Thresholds
        </a>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Normal", count: counts.OK, color: "text-green-600", bg: "bg-green-50 border-green-200" },
          { label: "Warning", count: counts.WARNING, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
          { label: "Alert", count: counts.ALERT, color: "text-red-600", bg: "bg-red-50 border-red-200" },
          { label: "Offline", count: counts.OFFLINE, color: "text-muted-foreground", bg: "bg-muted border-border" },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.bg}`}>
            <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.count}</div>
            <div className="text-sm text-muted-foreground mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Active Alerts */}
      {alerts.filter(a => !a.acknowledged).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Active Alerts ({alerts.filter(a => !a.acknowledged).length})</h2>
          {alerts.filter(a => !a.acknowledged).map(alert => (
            <div key={alert.id} className={`rounded-lg p-4 flex items-start justify-between ${severityColor[alert.severity]}`}>
              <div>
                <div className="font-medium text-foreground">{alert.location} — {alert.type.replace(/_/g, " ")}</div>
                <div className="text-sm text-foreground mt-0.5">{alert.message}</div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(alert.triggeredAt).toLocaleTimeString()}</div>
              </div>
              <button onClick={() => acknowledgeAlert(alert.id)} className="ml-4 text-xs px-3 py-1.5 bg-card border border-input rounded-md hover:bg-muted">
                Acknowledge
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sensor Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-foreground mr-2">Sensors</h2>
          {["ALL", "AIR_QUALITY", "ELECTRICITY", "WATER", "OCCUPANCY", "ALERT", "OFFLINE"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1 rounded-full border ${filter === f ? "bg-gray-800 text-white border-gray-800" : "text-muted-foreground border-border hover:bg-muted"}`}>
              {f.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(sensor => (
            <div key={sensor.deviceId} className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-medium text-foreground">{sensor.location}</div>
                  <div className="text-xs text-muted-foreground">{sensor.deviceId} · {sensor.sensorType.replace("_", " ")}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[sensor.status]}`}>{sensor.status}</span>
              </div>

              {sensor.sensorType === "AIR_QUALITY" && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className={`rounded-lg p-2 ${(sensor.lastReading.co2_ppm ?? 0) > 1000 ? "bg-red-50" : "bg-muted"}`}>
                    <div className="text-xs text-muted-foreground">CO₂</div>
                    <div className="font-bold text-foreground">{sensor.lastReading.co2_ppm} <span className="text-xs font-normal">ppm</span></div>
                  </div>
                  <div className={`rounded-lg p-2 ${(sensor.lastReading.pm25_ugm3 ?? 0) > 25 ? "bg-red-50" : "bg-muted"}`}>
                    <div className="text-xs text-muted-foreground">PM2.5</div>
                    <div className="font-bold text-foreground">{sensor.lastReading.pm25_ugm3} <span className="text-xs font-normal">µg/m³</span></div>
                  </div>
                  <div className="rounded-lg p-2 bg-muted">
                    <div className="text-xs text-muted-foreground">Temp</div>
                    <div className="font-bold text-foreground">{sensor.lastReading.temperature_c}°C</div>
                  </div>
                  <div className="rounded-lg p-2 bg-muted">
                    <div className="text-xs text-muted-foreground">Humidity</div>
                    <div className="font-bold text-foreground">{sensor.lastReading.humidity_pct}%</div>
                  </div>
                </div>
              )}

              {sensor.sensorType === "ELECTRICITY" && (
                <div className="rounded-lg p-3 bg-muted">
                  <div className="text-xs text-muted-foreground">Today's Consumption</div>
                  <div className="text-2xl font-bold text-foreground">{sensor.lastReading.kwh} <span className="text-sm font-normal text-muted-foreground">kWh</span></div>
                </div>
              )}

              {sensor.sensorType === "WATER" && (
                <div className="rounded-lg p-3 bg-muted">
                  <div className="text-xs text-muted-foreground">Today's Usage</div>
                  <div className="text-2xl font-bold text-foreground">{sensor.lastReading.liters?.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">L</span></div>
                </div>
              )}

              {sensor.sensorType === "OCCUPANCY" && (
                <div className={`rounded-lg p-3 text-center ${sensor.lastReading.occupied ? "bg-blue-50" : "bg-muted"}`}>
                  <div className="text-2xl">{sensor.lastReading.occupied ? "🟢" : "⚫"}</div>
                  <div className="text-sm font-medium mt-1">{sensor.lastReading.occupied ? "Occupied" : "Vacant"}</div>
                </div>
              )}

              <div className="text-xs text-muted-foreground mt-2">Last seen: {new Date(sensor.lastSeen).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
