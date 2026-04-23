"use client";
/**
 * Alert Thresholds Configuration UI
 * Admin sets CO2, PM2.5, temperature, energy limits per room type
 */
import { useState } from "react";

interface ThresholdConfig {
  roomType: string;
  co2_alert_ppm: number;
  pm25_alert_ugm3: number;
  temperature_max_c: number;
  temperature_min_c: number;
  humidity_max_pct: number;
  energy_spike_pct: number;  // % above daily baseline triggers alert
  water_spike_pct: number;
}

const DEFAULTS: ThresholdConfig[] = [
  { roomType: "Classroom", co2_alert_ppm: 1000, pm25_alert_ugm3: 25, temperature_max_c: 30, temperature_min_c: 18, humidity_max_pct: 70, energy_spike_pct: 30, water_spike_pct: 50 },
  { roomType: "Laboratory", co2_alert_ppm: 800, pm25_alert_ugm3: 15, temperature_max_c: 28, temperature_min_c: 20, humidity_max_pct: 60, energy_spike_pct: 20, water_spike_pct: 40 },
  { roomType: "Library", co2_alert_ppm: 900, pm25_alert_ugm3: 20, temperature_max_c: 26, temperature_min_c: 20, humidity_max_pct: 55, energy_spike_pct: 25, water_spike_pct: 45 },
  { roomType: "Cafeteria", co2_alert_ppm: 1200, pm25_alert_ugm3: 35, temperature_max_c: 32, temperature_min_c: 16, humidity_max_pct: 75, energy_spike_pct: 40, water_spike_pct: 60 },
  { roomType: "Gymnasium", co2_alert_ppm: 1500, pm25_alert_ugm3: 30, temperature_max_c: 32, temperature_min_c: 16, humidity_max_pct: 80, energy_spike_pct: 35, water_spike_pct: 55 },
];

export default function IotThresholdsPage() {
  const [configs, setConfigs] = useState<ThresholdConfig[]>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ThresholdConfig | null>(null);

  const startEdit = (cfg: ThresholdConfig) => {
    setEditing(cfg.roomType);
    setEditForm({ ...cfg });
  };

  const saveEdit = () => {
    if (!editForm) return;
    setConfigs(prev => prev.map(c => c.roomType === editForm.roomType ? editForm : c));
    setEditing(null);
    setEditForm(null);
  };

  const saveAll = async () => {
    // POST to /api/iot/thresholds
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const fields: { key: keyof ThresholdConfig; label: string; unit: string; min: number; max: number }[] = [
    { key: "co2_alert_ppm", label: "CO₂ Alert", unit: "ppm", min: 400, max: 5000 },
    { key: "pm25_alert_ugm3", label: "PM2.5 Alert", unit: "µg/m³", min: 5, max: 150 },
    { key: "temperature_max_c", label: "Temp Max", unit: "°C", min: 20, max: 45 },
    { key: "temperature_min_c", label: "Temp Min", unit: "°C", min: 10, max: 25 },
    { key: "humidity_max_pct", label: "Humidity Max", unit: "%", min: 30, max: 100 },
    { key: "energy_spike_pct", label: "Energy Spike", unit: "% above baseline", min: 10, max: 200 },
    { key: "water_spike_pct", label: "Water Spike", unit: "% above baseline", min: 10, max: 200 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alert Threshold Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">Set sensor alert limits per room type. Changes apply to all rooms of that type.</p>
        </div>
        <div className="flex gap-2">
          <a href="/iot" className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">
            ← Dashboard
          </a>
          <button onClick={saveAll} className={`px-4 py-2 text-sm rounded-lg text-white ${saved ? "bg-green-600" : "bg-gray-800 hover:bg-gray-700"}`}>
            {saved ? "Saved!" : "Save All Thresholds"}
          </button>
        </div>
      </div>

      {/* WHO / ASHRAE reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Reference standards:</strong> WHO recommends CO₂ &lt; 1000 ppm for adequate ventilation. PM2.5 24-hr average &lt; 15 µg/m³ (WHO 2021). ASHRAE 55 comfort range: 20–26°C, 30–60% RH.
      </div>

      <div className="space-y-4">
        {configs.map(cfg => (
          <div key={cfg.roomType} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-muted border-b border-border">
              <h2 className="font-semibold text-foreground">{cfg.roomType}</h2>
              {editing === cfg.roomType ? (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(null)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                  <button onClick={saveEdit} className="text-sm px-3 py-1 bg-gray-800 text-white rounded-md">Save</button>
                </div>
              ) : (
                <button onClick={() => startEdit(cfg)} className="text-sm text-muted-foreground hover:text-foreground border border-input px-3 py-1 rounded-md">
                  Edit
                </button>
              )}
            </div>

            <div className="p-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {fields.map(f => (
                <div key={f.key}>
                  <div className="text-xs text-muted-foreground mb-1">{f.label}</div>
                  {editing === cfg.roomType && editForm ? (
                    <div>
                      <input
                        type="number"
                        min={f.min}
                        max={f.max}
                        value={editForm[f.key] as number}
                        onChange={e => setEditForm({ ...editForm, [f.key]: Number(e.target.value) })}
                        className="w-full border border-input rounded px-2 py-1 text-sm"
                      />
                      <div className="text-xs text-muted-foreground mt-0.5">{f.unit}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold text-foreground">{cfg[f.key]}</div>
                      <div className="text-xs text-muted-foreground">{f.unit}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted border border-border rounded-xl p-4 text-sm text-muted-foreground">
        <strong>How thresholds work:</strong> When a sensor reading exceeds a threshold, an alert is sent to all ADMIN and FACILITY_MANAGER users via push notification and email. BMS automation triggers (lights/AC) are independent and governed by occupancy sensor events.
      </div>
    </div>
  );
}
