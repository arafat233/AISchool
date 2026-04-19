/**
 * Publishes PunchEvents to the LOCAL Mosquitto MQTT broker (school LAN).
 *
 * Topic: biometric/{schoolId}/punch
 * Payload: JSON-serialized PunchEvent
 *
 * The local broker can be bridged to the cloud broker via Mosquitto bridge config,
 * or the cloud subscriber connects directly to the cloud MQTT URL.
 */
import mqtt, { MqttClient } from "mqtt";
import { config } from "../config";
import { logger } from "../logger";
import type { PunchEvent } from "../zkteco/zkteco.poller";

export class MqttPublisher {
  private client: MqttClient | null = null;
  private connected = false;
  private publishQueue: Array<{ topic: string; payload: string }> = [];

  connect(): void {
    const opts: mqtt.IClientOptions = {
      clientId: `biometric-bridge-pub-${config.SCHOOL_ID}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    };
    if (config.LOCAL_MQTT_USERNAME) {
      opts.username = config.LOCAL_MQTT_USERNAME;
      opts.password = config.LOCAL_MQTT_PASSWORD;
    }

    this.client = mqtt.connect(config.LOCAL_MQTT_URL, opts);

    this.client.on("connect", () => {
      this.connected = true;
      logger.info("MQTT publisher connected to local broker", { url: config.LOCAL_MQTT_URL });
      this.flushQueue();
    });

    this.client.on("error", (err) => {
      logger.error("MQTT publisher error", { err: err.message });
    });

    this.client.on("offline", () => {
      this.connected = false;
      logger.warn("MQTT publisher went offline");
    });

    this.client.on("reconnect", () => {
      logger.debug("MQTT publisher reconnecting…");
    });
  }

  publishPunch(event: PunchEvent): void {
    const topic = `biometric/${event.schoolId}/punch`;
    const payload = JSON.stringify({
      ...event,
      recordTime: event.recordTime.toISOString(),
      publishedAt: new Date().toISOString(),
    });

    if (!this.connected || !this.client) {
      // Buffer until reconnected — max 500 entries to avoid memory bloat
      if (this.publishQueue.length < 500) {
        this.publishQueue.push({ topic, payload });
      }
      return;
    }

    this.client.publish(topic, payload, { qos: 1, retain: false }, (err) => {
      if (err) {
        logger.error("MQTT publish failed", { topic, err: err.message });
      } else {
        logger.debug("MQTT punch published", { topic, deviceName: event.deviceName, userId: event.deviceUserId });
      }
    });
  }

  publishDeviceStatus(deviceName: string, status: "ONLINE" | "OFFLINE", schoolId: string): void {
    if (!this.client || !this.connected) return;
    const topic = `biometric/${schoolId}/device-status`;
    const payload = JSON.stringify({ deviceName, status, timestamp: new Date().toISOString() });
    this.client.publish(topic, payload, { qos: 1, retain: true });
  }

  private flushQueue(): void {
    if (this.publishQueue.length === 0) return;
    logger.info(`Flushing ${this.publishQueue.length} buffered MQTT messages`);
    for (const { topic, payload } of this.publishQueue) {
      this.client?.publish(topic, payload, { qos: 1 });
    }
    this.publishQueue = [];
  }

  disconnect(): void {
    this.client?.end();
  }
}
