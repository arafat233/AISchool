/**
 * ZKTeco / eSSL SDK wrapper using node-zklib.
 * Fetches raw attendance logs from a single device via TCP (port 4370).
 *
 * node-zklib communicates with ZKTeco's proprietary UDP/TCP protocol.
 * Real production devices: ZKTeco K40, F18, uFace202, eSSL X990.
 */
import ZKLib from "node-zklib";
import { logger } from "../logger";

export interface RawPunch {
  deviceUserId: string;   // user ID stored on the device
  recordTime: Date;
  punchType: number;      // 0 = check-in, 1 = check-out, 4 = overtime-in, etc.
  verifyType: number;     // 1 = fingerprint, 3 = password, 15 = face
}

export class ZKTecoClient {
  private zk: InstanceType<typeof ZKLib>;
  private connected = false;

  constructor(
    public readonly deviceName: string,
    private readonly host: string,
    private readonly port: number,
    private readonly timeout = 5000
  ) {
    this.zk = new ZKLib(host, port, timeout, 4000);
  }

  async connect(): Promise<boolean> {
    try {
      await this.zk.createSocket();
      this.connected = true;
      logger.debug(`ZKTeco connected`, { device: this.deviceName, host: this.host });
      return true;
    } catch (err) {
      logger.warn(`ZKTeco connect failed`, { device: this.deviceName, err: String(err) });
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      try {
        await this.zk.disconnect();
      } catch {
        // ignore
      }
      this.connected = false;
    }
  }

  /**
   * Fetch all attendance records from device since `since`.
   * node-zklib returns the full log; we filter client-side by time window.
   */
  async fetchAttendance(since: Date): Promise<RawPunch[]> {
    if (!this.connected) {
      const ok = await this.connect();
      if (!ok) return [];
    }

    try {
      const { data } = await this.zk.getAttendances(() => {});
      const punches: RawPunch[] = (data as any[])
        .filter((r) => {
          const t = new Date(r.recordTime);
          return t >= since;
        })
        .map((r) => ({
          deviceUserId: String(r.deviceUserId),
          recordTime: new Date(r.recordTime),
          punchType: r.inOutStatus ?? 0,
          verifyType: r.verifyType ?? 1,
        }));
      logger.debug(`Fetched ${punches.length} punches since ${since.toISOString()}`, { device: this.deviceName });
      return punches;
    } catch (err) {
      logger.error(`Failed to fetch attendance`, { device: this.deviceName, err: String(err) });
      await this.disconnect();
      return [];
    }
  }

  /**
   * Retrieve user list from device (deviceUserId → name mapping).
   * Used to map punches to school student/staff IDs.
   */
  async getUsers(): Promise<Array<{ uid: string; name: string; userId: string }>> {
    if (!this.connected) await this.connect();
    try {
      const { data } = await this.zk.getUsers();
      return (data as any[]).map((u) => ({
        uid: String(u.uid),
        name: u.name ?? "",
        userId: String(u.userId),
      }));
    } catch (err) {
      logger.error(`Failed to get users`, { device: this.deviceName, err: String(err) });
      return [];
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
