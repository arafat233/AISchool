/**
 * HTTP client for the Attendance microservice (NestJS, port 3005).
 * Used by the MQTT subscriber to sync biometric punches as attendance records.
 */
import axios, { AxiosInstance } from "axios";
import { config } from "../config";
import { logger } from "../logger";

export interface ResolvedUser {
  userId: string;           // internal school DB id
  userType: "STUDENT" | "STAFF";
  name: string;
}

export interface MarkAttendanceDto {
  schoolId: string;
  userId: string;
  userType: "STUDENT" | "STAFF";
  date: string;             // YYYY-MM-DD
  status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY";
  checkInTime?: string;     // ISO timestamp
  checkOutTime?: string;
  source: "BIOMETRIC" | "MANUAL" | "RFID";
  deviceName: string;
}

export class AttendanceClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: config.ATTENDANCE_SERVICE_URL,
      timeout: 8000,
      headers: {
        "Content-Type": "application/json",
        ...(config.ATTENDANCE_SERVICE_API_KEY
          ? { "x-api-key": config.ATTENDANCE_SERVICE_API_KEY }
          : {}),
      },
    });
  }

  /**
   * Resolve a device-local user ID to the school's internal user ID.
   * The ZKTeco device stores user IDs that were enrolled at the time of registration.
   * Attendance service maintains the mapping table.
   */
  async resolveDeviceUser(deviceUserId: string, schoolId: string): Promise<ResolvedUser | null> {
    try {
      const res = await this.http.get<ResolvedUser>(
        `/biometric/resolve-user`,
        { params: { deviceUserId, schoolId } }
      );
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null;  // Unknown user on device — not enrolled in school system
      }
      logger.error("AttendanceClient.resolveDeviceUser failed", { deviceUserId, err: String(err) });
      return null;
    }
  }

  /**
   * Upsert a biometric attendance record.
   * If a record already exists for same student/date/source=BIOMETRIC it will be updated.
   */
  async markAttendance(dto: MarkAttendanceDto): Promise<boolean> {
    try {
      await this.http.post("/biometric/mark", dto);
      logger.info("Attendance marked", {
        userId: dto.userId,
        userType: dto.userType,
        date: dto.date,
        status: dto.status,
        source: dto.source,
      });
      return true;
    } catch (err: any) {
      logger.error("AttendanceClient.markAttendance failed", {
        userId: dto.userId,
        status: err?.response?.status,
        message: err?.message,
      });
      return false;
    }
  }

  /**
   * Fetch existing manual attendance for a student on a given date.
   * Used by ConflictService to detect biometric vs manual discrepancies.
   */
  async getManualAttendance(
    userId: string,
    userType: "STUDENT" | "STAFF",
    date: string,
    schoolId: string
  ): Promise<{ status: string; source: string } | null> {
    try {
      const res = await this.http.get<{ status: string; source: string }>(
        `/biometric/manual-record`,
        { params: { userId, userType, date, schoolId } }
      );
      return res.data;
    } catch {
      return null;
    }
  }
}
