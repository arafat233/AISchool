/**
 * Polls all configured ZKTeco devices at a configurable interval.
 * Emits normalized PunchEvent objects for downstream processing.
 */
import schedule from "node-schedule";
import { EventEmitter } from "events";
import { ZKTecoClient } from "./zkteco.client";
import { DeviceConfig, config } from "../config";
import { logger } from "../logger";

export interface PunchEvent {
  deviceName: string;
  deviceUserId: string;   // ID on the biometric device
  recordTime: Date;
  punchType: "CHECK_IN" | "CHECK_OUT" | "OVERTIME_IN" | "OVERTIME_OUT" | "UNKNOWN";
  verifyMethod: "FINGERPRINT" | "FACE" | "CARD" | "PASSWORD" | "UNKNOWN";
  schoolId: string;
}

const PUNCH_TYPE_MAP: Record<number, PunchEvent["punchType"]> = {
  0: "CHECK_IN",
  1: "CHECK_OUT",
  4: "OVERTIME_IN",
  5: "OVERTIME_OUT",
};

const VERIFY_TYPE_MAP: Record<number, PunchEvent["verifyMethod"]> = {
  1: "FINGERPRINT",
  3: "PASSWORD",
  4: "CARD",
  15: "FACE",
};

export class ZKTecoPoller extends EventEmitter {
  private clients: ZKTecoClient[] = [];
  private job: schedule.Job | null = null;
  // Track last successful poll per device to avoid re-processing the same punches
  private lastPollTime: Map<string, Date> = new Map();

  constructor(private readonly devices: DeviceConfig[]) {
    super();
    this.clients = devices.map(
      (d) => new ZKTecoClient(d.name, d.host, d.port)
    );
  }

  start(): void {
    const intervalSec = config.POLL_INTERVAL_SECONDS;
    logger.info(`ZKTeco poller starting — ${this.clients.length} device(s), every ${intervalSec}s`);

    // Run immediately on start, then on schedule
    this.poll();
    this.job = schedule.scheduleJob(`*/${intervalSec} * * * * *`, () => this.poll());
  }

  stop(): void {
    this.job?.cancel();
    this.clients.forEach((c) => c.disconnect());
    logger.info("ZKTeco poller stopped");
  }

  private async poll(): Promise<void> {
    await Promise.allSettled(this.clients.map((client) => this.pollDevice(client)));
  }

  private async pollDevice(client: ZKTecoClient): Promise<void> {
    const since = this.getSince(client.deviceName);
    const raw = await client.fetchAttendance(since);

    if (raw.length === 0) return;

    // Update watermark to latest record fetched
    const latest = raw.reduce((max, r) => r.recordTime > max ? r.recordTime : max, raw[0].recordTime);
    this.lastPollTime.set(client.deviceName, latest);

    for (const r of raw) {
      const event: PunchEvent = {
        deviceName: client.deviceName,
        deviceUserId: r.deviceUserId,
        recordTime: r.recordTime,
        punchType: PUNCH_TYPE_MAP[r.punchType] ?? "UNKNOWN",
        verifyMethod: VERIFY_TYPE_MAP[r.verifyType] ?? "UNKNOWN",
        schoolId: config.SCHOOL_ID,
      };
      this.emit("punch", event);
    }

    logger.info(`Polled ${raw.length} punch(es) from ${client.deviceName}`);
  }

  private getSince(deviceName: string): Date {
    const last = this.lastPollTime.get(deviceName);
    if (last) return last;
    // First poll: go back FETCH_WINDOW_MINUTES
    const d = new Date();
    d.setMinutes(d.getMinutes() - config.FETCH_WINDOW_MINUTES);
    return d;
  }

  getDeviceNames(): string[] {
    return this.clients.map((c) => c.deviceName);
  }
}
