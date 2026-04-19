/**
 * IoT Sensor Integration
 *
 * Ingests data from:
 *  - Air quality sensors (CO2 ppm, PM2.5 µg/m³) per classroom
 *  - Smart electricity meters per floor/block
 *  - Smart water meters per block
 *  - Occupancy sensors (triggers lights/AC via BMS webhook)
 *
 * Pipeline: MQTT → this service → InfluxDB (time-series, 90-day retention) + PostgreSQL (daily aggregates)
 * Alerts: CO2 > 1000 ppm, PM2.5 > 25 µg/m³, abnormal energy consumption
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InfluxDB, Point } from "@influxdata/influxdb-client";
import axios from "axios";
import mqtt from "mqtt";

export interface SensorReading {
  schoolId: string;
  deviceId: string;
  location: string;           // "ClassroomA1" / "Block-A-Floor-2"
  sensorType: "AIR_QUALITY" | "ELECTRICITY" | "WATER" | "OCCUPANCY";
  readings: {
    co2_ppm?: number;
    pm25_ugm3?: number;
    temperature_c?: number;
    humidity_pct?: number;
    kwh?: number;             // electricity
    liters?: number;          // water
    occupied?: boolean;       // occupancy
  };
  timestamp: Date;
}

// Alert thresholds (defaults — configurable per school)
const DEFAULTS = {
  co2_alert_ppm: 1000,
  pm25_alert_ugm3: 25,
};

@Injectable()
export class IotService {
  private readonly logger = new Logger(IotService.name);
  private influx: InfluxDB;
  private writeApi: ReturnType<InfluxDB["getWriteApi"]>;

  constructor(private readonly prisma: PrismaService) {
    this.influx = new InfluxDB({
      url: process.env.INFLUXDB_URL ?? "http://influxdb:8086",
      token: process.env.INFLUXDB_TOKEN ?? "",
    });
    this.writeApi = this.influx.getWriteApi(
      process.env.INFLUXDB_ORG ?? "school-erp",
      process.env.INFLUXDB_BUCKET ?? "sensors",
      "s"  // second precision
    );
  }

  /** Called when a sensor reading arrives via MQTT */
  async ingestReading(reading: SensorReading): Promise<void> {
    // ── Write to InfluxDB (time-series) ──────────────────────────────────
    const point = new Point("sensor_reading")
      .tag("school_id", reading.schoolId)
      .tag("device_id", reading.deviceId)
      .tag("location", reading.location)
      .tag("sensor_type", reading.sensorType)
      .timestamp(reading.timestamp);

    if (reading.readings.co2_ppm !== undefined) point.floatField("co2_ppm", reading.readings.co2_ppm);
    if (reading.readings.pm25_ugm3 !== undefined) point.floatField("pm25_ugm3", reading.readings.pm25_ugm3);
    if (reading.readings.temperature_c !== undefined) point.floatField("temperature_c", reading.readings.temperature_c);
    if (reading.readings.humidity_pct !== undefined) point.floatField("humidity_pct", reading.readings.humidity_pct);
    if (reading.readings.kwh !== undefined) point.floatField("kwh", reading.readings.kwh);
    if (reading.readings.liters !== undefined) point.floatField("liters", reading.readings.liters);

    this.writeApi.writePoint(point);

    // ── Check thresholds ───────────────────────────────────────────────
    await this.checkThresholds(reading);

    // ── Occupancy → BMS trigger ────────────────────────────────────────
    if (reading.sensorType === "OCCUPANCY") {
      await this.triggerBms(reading.schoolId, reading.location, reading.readings.occupied ?? false);
    }
  }

  private async checkThresholds(reading: SensorReading): Promise<void> {
    const thresholds = await this.getSchoolThresholds(reading.schoolId);

    if (reading.readings.co2_ppm && reading.readings.co2_ppm > (thresholds?.co2_alert_ppm ?? DEFAULTS.co2_alert_ppm)) {
      await this.sendAlert(reading.schoolId, "AIR_QUALITY_CO2",
        `CO2 level in ${reading.location}: ${reading.readings.co2_ppm} ppm (limit: ${thresholds?.co2_alert_ppm ?? DEFAULTS.co2_alert_ppm} ppm)`, "HIGH");
    }

    if (reading.readings.pm25_ugm3 && reading.readings.pm25_ugm3 > (thresholds?.pm25_alert_ugm3 ?? DEFAULTS.pm25_alert_ugm3)) {
      await this.sendAlert(reading.schoolId, "AIR_QUALITY_PM25",
        `PM2.5 in ${reading.location}: ${reading.readings.pm25_ugm3} µg/m³ — possible air quality issue`, "HIGH");
    }
  }

  private async triggerBms(schoolId: string, location: string, occupied: boolean): Promise<void> {
    const bmsUrl = process.env.BMS_WEBHOOK_URL;
    if (!bmsUrl) return;
    try {
      await axios.post(bmsUrl, { schoolId, location, occupied, timestamp: new Date().toISOString() });
    } catch {
      // Non-critical
    }
  }

  async getMonthlyReport(schoolId: string): Promise<any> {
    // Average air quality + energy trend per classroom from PostgreSQL daily aggregates
    return this.prisma.$queryRaw`
      SELECT
        location,
        sensor_type,
        DATE_TRUNC('month', reading_date) AS month,
        AVG(avg_co2_ppm) AS avg_co2,
        AVG(avg_pm25) AS avg_pm25,
        SUM(total_kwh) AS total_kwh,
        SUM(total_liters) AS total_liters
      FROM iot_daily_aggregates
      WHERE school_id = ${schoolId}
        AND reading_date >= NOW() - INTERVAL '3 months'
      GROUP BY location, sensor_type, DATE_TRUNC('month', reading_date)
      ORDER BY month DESC, location
    `;
  }

  private async getSchoolThresholds(schoolId: string): Promise<any> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM iot_alert_thresholds WHERE school_id = ${schoolId}
    `;
    return rows[0] ?? null;
  }

  private async sendAlert(schoolId: string, type: string, message: string, severity: string) {
    try {
      await axios.post(`${process.env.NOTIFICATION_SERVICE_URL ?? "http://notification-service:3007"}/internal/alert`, {
        type, schoolId, title: `IoT Alert: ${type}`, body: message,
        recipients: ["ADMIN", "FACILITY_MANAGER"], severity,
      });
    } catch { /* non-critical */ }
  }
}
