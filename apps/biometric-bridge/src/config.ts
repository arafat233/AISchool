import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const schema = z.object({
  // School / tenant
  SCHOOL_ID: z.string().min(1),

  // ZKTeco devices — comma-separated list of "name:host:port" e.g. "MainGate:192.168.1.201:4370,StaffGate:192.168.1.202:4370"
  DEVICES: z.string().default("MainGate:192.168.1.201:4370"),

  // Poll interval (seconds) — how often to fetch attendance logs from devices
  POLL_INTERVAL_SECONDS: z.coerce.number().default(60),

  // Local MQTT broker (Mosquitto on school LAN)
  LOCAL_MQTT_URL: z.string().default("mqtt://localhost:1883"),
  LOCAL_MQTT_USERNAME: z.string().optional(),
  LOCAL_MQTT_PASSWORD: z.string().optional(),

  // Cloud MQTT broker (bridges punch events to cloud attendance-service)
  CLOUD_MQTT_URL: z.string().default("mqtt://localhost:1883"),
  CLOUD_MQTT_USERNAME: z.string().optional(),
  CLOUD_MQTT_PASSWORD: z.string().optional(),

  // Attendance microservice HTTP endpoint
  ATTENDANCE_SERVICE_URL: z.string().default("http://localhost:3005"),
  ATTENDANCE_SERVICE_API_KEY: z.string().default(""),

  // Notification service (for device-offline alerts)
  NOTIFICATION_SERVICE_URL: z.string().default("http://localhost:3007"),

  // Device health — alert after this many minutes of silence
  HEALTH_ALERT_THRESHOLD_MINUTES: z.coerce.number().default(30),

  // How many minutes back to fetch logs on each poll
  FETCH_WINDOW_MINUTES: z.coerce.number().default(10),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment config:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;

export interface DeviceConfig {
  name: string;
  host: string;
  port: number;
}

export function parseDevices(): DeviceConfig[] {
  return config.DEVICES.split(",").map((d) => {
    const [name, host, portStr] = d.trim().split(":");
    return { name, host, port: parseInt(portStr ?? "4370", 10) };
  });
}
