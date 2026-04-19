/**
 * Conflict Resolution — Biometric vs Manual attendance.
 *
 * A conflict occurs when:
 *   - Biometric says PRESENT but manual says ABSENT (or vice-versa)
 *   - A manual entry already exists for the same student/date from a teacher
 *
 * Resolution policy (per school config):
 *   - Default: flag for admin review — do NOT auto-overwrite
 *   - Admin sees flagged conflicts in Admin Portal and resolves with one click
 *   - Resolved record is written as source = "RESOLVED_BIOMETRIC" or "RESOLVED_MANUAL"
 */
import axios from "axios";
import { config } from "../config";
import { logger } from "../logger";
import { AttendanceClient } from "../sync/attendance.client";

export interface ConflictCheckParams {
  schoolId: string;
  userId: string;
  userType: "STUDENT" | "STAFF";
  recordTime: Date;
  biometricPunchType: string;
}

export interface ConflictRecord {
  manualStatus: string;
  source: string;
}

export interface FlagConflictDto {
  schoolId: string;
  userId: string;
  userType: "STUDENT" | "STAFF";
  recordTime: Date;
  biometricStatus: string;
  manualStatus: string;
  deviceName: string;
}

export class ConflictService {
  constructor(private readonly attendanceClient: AttendanceClient) {}

  /**
   * Check if a manual attendance record exists that differs from the biometric punch.
   * Returns the conflicting manual record, or null if no conflict.
   */
  async checkConflict(params: ConflictCheckParams): Promise<ConflictRecord | null> {
    const date = params.recordTime.toISOString().split("T")[0];
    const biometricStatus = params.biometricPunchType === "CHECK_IN" ? "PRESENT" : "PRESENT";

    const existing = await this.attendanceClient.getManualAttendance(
      params.userId,
      params.userType,
      date,
      params.schoolId
    );

    if (!existing) return null;  // No manual record — no conflict
    if (existing.source === "BIOMETRIC") return null;  // Already from biometric — no conflict

    // Conflict: manual record exists AND it disagrees (or is already set)
    if (existing.status !== biometricStatus) {
      return { manualStatus: existing.status, source: existing.source };
    }

    return null;
  }

  /**
   * Persist a conflict flag to the attendance service so admin can review it.
   * The Admin Portal shows all open conflicts with RESOLVE/KEEP_MANUAL/KEEP_BIOMETRIC actions.
   */
  async flagConflict(dto: FlagConflictDto): Promise<void> {
    try {
      await axios.post(`${config.ATTENDANCE_SERVICE_URL}/biometric/conflict`, {
        schoolId: dto.schoolId,
        userId: dto.userId,
        userType: dto.userType,
        date: dto.recordTime.toISOString().split("T")[0],
        recordTime: dto.recordTime.toISOString(),
        biometricStatus: dto.biometricStatus,
        manualStatus: dto.manualStatus,
        deviceName: dto.deviceName,
        status: "PENDING_REVIEW",
        createdAt: new Date().toISOString(),
      });
      logger.info("Conflict flagged for admin review", {
        userId: dto.userId,
        date: dto.recordTime.toISOString().split("T")[0],
        biometric: dto.biometricStatus,
        manual: dto.manualStatus,
      });
    } catch (err) {
      logger.error("Failed to flag conflict", { userId: dto.userId, err: String(err) });
    }
  }
}
