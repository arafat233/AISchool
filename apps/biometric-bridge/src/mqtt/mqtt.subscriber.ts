/**
 * Subscribes to the CLOUD MQTT broker and forwards punch events
 * to the Attendance microservice via HTTP.
 *
 * Topic subscribed: biometric/{schoolId}/punch
 *
 * Flow:
 *   ZKTeco device → local MQTT (publish) → [Mosquitto bridge OR cloud relay]
 *   → cloud MQTT (subscribe here) → Attendance Service HTTP API
 */
import mqtt, { MqttClient } from "mqtt";
import { config } from "../config";
import { logger } from "../logger";
import { AttendanceClient } from "../sync/attendance.client";
import { ConflictService } from "../conflict/conflict.service";

export class MqttSubscriber {
  private client: MqttClient | null = null;

  constructor(
    private readonly attendanceClient: AttendanceClient,
    private readonly conflictService: ConflictService
  ) {}

  connect(): void {
    const opts: mqtt.IClientOptions = {
      clientId: `biometric-bridge-sub-${config.SCHOOL_ID}-${Date.now()}`,
      clean: false,          // persist session so no messages are missed on reconnect
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    };
    if (config.CLOUD_MQTT_USERNAME) {
      opts.username = config.CLOUD_MQTT_USERNAME;
      opts.password = config.CLOUD_MQTT_PASSWORD;
    }

    this.client = mqtt.connect(config.CLOUD_MQTT_URL, opts);

    this.client.on("connect", () => {
      logger.info("MQTT subscriber connected to cloud broker", { url: config.CLOUD_MQTT_URL });
      const topic = `biometric/${config.SCHOOL_ID}/punch`;
      this.client!.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          logger.error("MQTT subscribe failed", { topic, err: err.message });
        } else {
          logger.info(`Subscribed to ${topic}`);
        }
      });
    });

    this.client.on("message", async (topic, messageBuffer) => {
      try {
        const payload = JSON.parse(messageBuffer.toString());
        await this.handlePunch(payload);
      } catch (err) {
        logger.error("Failed to process MQTT message", { topic, err: String(err) });
      }
    });

    this.client.on("error", (err) => {
      logger.error("MQTT subscriber error", { err: err.message });
    });

    this.client.on("offline", () => {
      logger.warn("MQTT subscriber went offline — will reconnect");
    });
  }

  private async handlePunch(payload: Record<string, unknown>): Promise<void> {
    const deviceUserId = String(payload.deviceUserId ?? "");
    const recordTime = new Date(String(payload.recordTime));
    const punchType = String(payload.punchType ?? "CHECK_IN");
    const schoolId = String(payload.schoolId ?? config.SCHOOL_ID);
    const deviceName = String(payload.deviceName ?? "");

    if (!deviceUserId || isNaN(recordTime.getTime())) {
      logger.warn("Malformed punch payload, skipping", { payload });
      return;
    }

    logger.debug("Processing punch", { deviceUserId, recordTime, punchType, deviceName });

    // Resolve device user ID → school user ID
    const resolved = await this.attendanceClient.resolveDeviceUser(deviceUserId, schoolId);
    if (!resolved) {
      logger.warn("Could not resolve device user — punch ignored", { deviceUserId, schoolId });
      return;
    }

    // Check for conflict with existing manual attendance for same student/date
    const conflict = await this.conflictService.checkConflict({
      schoolId,
      userId: resolved.userId,
      userType: resolved.userType,
      recordTime,
      biometricPunchType: punchType,
    });

    if (conflict) {
      logger.warn("Conflict detected — flagging for admin review", { userId: resolved.userId, recordTime });
      await this.conflictService.flagConflict({
        schoolId,
        userId: resolved.userId,
        userType: resolved.userType,
        recordTime,
        biometricStatus: punchType === "CHECK_IN" ? "PRESENT" : "LEFT",
        manualStatus: conflict.manualStatus,
        deviceName,
      });
      return;  // Do not auto-overwrite; admin resolves manually
    }

    // No conflict — sync to Attendance Service
    await this.attendanceClient.markAttendance({
      schoolId,
      userId: resolved.userId,
      userType: resolved.userType,
      date: recordTime.toISOString().split("T")[0],
      status: punchType === "CHECK_IN" ? "PRESENT" : "PRESENT",
      checkInTime: punchType === "CHECK_IN" ? recordTime.toISOString() : undefined,
      checkOutTime: punchType === "CHECK_OUT" ? recordTime.toISOString() : undefined,
      source: "BIOMETRIC",
      deviceName,
    });
  }

  disconnect(): void {
    this.client?.end();
  }
}
