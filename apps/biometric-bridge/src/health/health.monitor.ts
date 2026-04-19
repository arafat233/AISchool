/**
 * Device Health Monitor
 *
 * Tracks the last time each ZKTeco device successfully communicated.
 * If a device goes silent for > HEALTH_ALERT_THRESHOLD_MINUTES minutes,
 * an alert is sent via the Notification Service.
 *
 * Also exposes a /health HTTP endpoint for the Docker health check.
 */
import http from "http";
import axios from "axios";
import { config } from "../config";
import { logger } from "../logger";
import type { MqttPublisher } from "../mqtt/mqtt.publisher";

interface DeviceHealth {
  name: string;
  lastSeen: Date | null;
  status: "ONLINE" | "OFFLINE" | "UNKNOWN";
  alertSent: boolean;
}

export class HealthMonitor {
  private devices: Map<string, DeviceHealth> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private httpServer: http.Server | null = null;

  constructor(
    deviceNames: string[],
    private readonly publisher: MqttPublisher
  ) {
    for (const name of deviceNames) {
      this.devices.set(name, { name, lastSeen: null, status: "UNKNOWN", alertSent: false });
    }
  }

  /** Call this whenever a device successfully delivers punch data */
  recordActivity(deviceName: string): void {
    const entry = this.devices.get(deviceName);
    if (!entry) return;
    const wasOffline = entry.status === "OFFLINE" || entry.status === "UNKNOWN";
    entry.lastSeen = new Date();
    entry.status = "ONLINE";
    entry.alertSent = false;

    if (wasOffline) {
      logger.info(`Device back ONLINE: ${deviceName}`);
      this.publisher.publishDeviceStatus(deviceName, "ONLINE", config.SCHOOL_ID);
      this.sendRecoveryNotification(deviceName);
    }
  }

  start(): void {
    const thresholdMs = config.HEALTH_ALERT_THRESHOLD_MINUTES * 60 * 1000;
    // Check every minute
    this.checkInterval = setInterval(() => this.checkAll(thresholdMs), 60_000);
    logger.info(`Health monitor started — alert threshold: ${config.HEALTH_ALERT_THRESHOLD_MINUTES} min`);
    this.startHttpHealthServer();
  }

  stop(): void {
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.httpServer?.close();
  }

  private checkAll(thresholdMs: number): void {
    const now = Date.now();
    for (const [name, entry] of this.devices) {
      if (!entry.lastSeen) continue;  // Never seen — no alert yet

      const silenceMs = now - entry.lastSeen.getTime();
      if (silenceMs > thresholdMs && entry.status !== "OFFLINE") {
        entry.status = "OFFLINE";
        logger.warn(`Device OFFLINE: ${name} (last seen ${Math.round(silenceMs / 60000)} min ago)`);
        this.publisher.publishDeviceStatus(name, "OFFLINE", config.SCHOOL_ID);
        if (!entry.alertSent) {
          entry.alertSent = true;
          this.sendOfflineAlert(name, Math.round(silenceMs / 60000));
        }
      }
    }
  }

  private async sendOfflineAlert(deviceName: string, silentMinutes: number): Promise<void> {
    try {
      await axios.post(`${config.NOTIFICATION_SERVICE_URL}/internal/alert`, {
        type: "BIOMETRIC_DEVICE_OFFLINE",
        schoolId: config.SCHOOL_ID,
        title: `Biometric Device Offline: ${deviceName}`,
        body: `Device "${deviceName}" has not reported any punches for ${silentMinutes} minutes. Please check the device connection.`,
        recipients: ["ADMIN", "TRANSPORT_MANAGER"],
        severity: "HIGH",
        metadata: { deviceName, silentMinutes },
      });
      logger.info(`Offline alert sent for device: ${deviceName}`);
    } catch (err) {
      logger.error("Failed to send offline alert", { deviceName, err: String(err) });
    }
  }

  private async sendRecoveryNotification(deviceName: string): Promise<void> {
    try {
      await axios.post(`${config.NOTIFICATION_SERVICE_URL}/internal/alert`, {
        type: "BIOMETRIC_DEVICE_RECOVERED",
        schoolId: config.SCHOOL_ID,
        title: `Biometric Device Online: ${deviceName}`,
        body: `Device "${deviceName}" is back online and reporting punches.`,
        recipients: ["ADMIN"],
        severity: "INFO",
        metadata: { deviceName },
      });
    } catch {
      // Non-critical
    }
  }

  /** Lightweight HTTP server for Docker HEALTHCHECK and k8s liveness probe */
  private startHttpHealthServer(): void {
    this.httpServer = http.createServer((req, res) => {
      if (req.url === "/health") {
        const summary = Array.from(this.devices.values()).map((d) => ({
          name: d.name,
          status: d.status,
          lastSeen: d.lastSeen?.toISOString() ?? null,
        }));
        const allOffline = summary.every((d) => d.status === "OFFLINE");
        res.writeHead(allOffline ? 503 : 200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: allOffline ? "degraded" : "ok", devices: summary }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    this.httpServer.listen(8080, () => {
      logger.info("Health HTTP server listening on :8080");
    });
  }

  getStatus(): DeviceHealth[] {
    return Array.from(this.devices.values());
  }
}
