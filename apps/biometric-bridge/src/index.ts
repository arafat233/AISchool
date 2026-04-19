/**
 * Biometric Bridge — Entry Point
 *
 * Orchestrates:
 *  1. ZKTecoPoller    — polls devices at configurable interval
 *  2. MqttPublisher   — publishes PunchEvents to local Mosquitto broker
 *  3. MqttSubscriber  — subscribes cloud MQTT, syncs to Attendance Service
 *  4. ConflictService — detects biometric vs manual conflicts, flags for admin
 *  5. HealthMonitor   — tracks device last-seen, alerts on > 30 min silence
 */
import { parseDevices } from "./config";
import { logger } from "./logger";
import { ZKTecoPoller } from "./zkteco/zkteco.poller";
import { MqttPublisher } from "./mqtt/mqtt.publisher";
import { MqttSubscriber } from "./mqtt/mqtt.subscriber";
import { AttendanceClient } from "./sync/attendance.client";
import { ConflictService } from "./conflict/conflict.service";
import { HealthMonitor } from "./health/health.monitor";

async function main() {
  logger.info("=== Biometric Bridge starting ===");

  const devices = parseDevices();
  logger.info(`Configured devices: ${devices.map((d) => `${d.name}(${d.host}:${d.port})`).join(", ")}`);

  // ── Services ─────────────────────────────────────────────────────────────
  const attendanceClient = new AttendanceClient();
  const conflictService = new ConflictService(attendanceClient);
  const publisher = new MqttPublisher();
  const subscriber = new MqttSubscriber(attendanceClient, conflictService);
  const poller = new ZKTecoPoller(devices);
  const healthMonitor = new HealthMonitor(poller.getDeviceNames(), publisher);

  // ── Wire up events ────────────────────────────────────────────────────────
  poller.on("punch", (event) => {
    publisher.publishPunch(event);
    healthMonitor.recordActivity(event.deviceName);
  });

  // ── Start all services ────────────────────────────────────────────────────
  publisher.connect();
  subscriber.connect();
  poller.start();
  healthMonitor.start();

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal} — shutting down gracefully`);
    poller.stop();
    publisher.disconnect();
    subscriber.disconnect();
    healthMonitor.stop();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { err: err.message, stack: err.stack });
  });
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
  });

  logger.info("=== Biometric Bridge running ===");
}

main().catch((err) => {
  logger.error("Fatal startup error", { err: String(err) });
  process.exit(1);
});
