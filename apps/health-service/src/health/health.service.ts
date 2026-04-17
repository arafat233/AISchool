import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Medical Profile ──────────────────────────────────────────────────────────

  async upsertMedicalProfile(studentId: string, data: {
    bloodGroup?: string; allergies?: any[]; chronicConditions?: any[];
    medications?: any[]; emergencyContact?: string; emergencyPhone?: string;
    insuranceProvider?: string; insurancePolicyNo?: string;
    doctorName?: string; doctorPhone?: string;
  }) {
    return this.prisma.studentMedicalProfile.upsert({
      where: { studentId },
      create: { studentId, ...data },
      update: data,
    });
  }

  async getMedicalProfile(studentId: string) {
    return this.prisma.studentMedicalProfile.findUnique({ where: { studentId } });
  }

  // ─── Nurse visit log ──────────────────────────────────────────────────────────

  async logNurseVisit(schoolId: string, data: {
    studentId: string; complaint: string; temperature?: number;
    bpSystolic?: number; bpDiastolic?: number; pulse?: number;
    treatment?: string; medicationGiven?: string; disposition?: string;
    parentNotified?: boolean; attendedBy: string;
  }) {
    return this.prisma.nurseVisitLog.create({
      data: {
        schoolId, ...data,
        disposition: data.disposition ?? "RETURNED_TO_CLASS",
        parentNotifiedAt: data.parentNotified ? new Date() : undefined,
      },
    });
  }

  async getNurseVisits(schoolId: string, studentId?: string) {
    return this.prisma.nurseVisitLog.findMany({
      where: { schoolId, ...(studentId ? { studentId } : {}) },
      orderBy: { visitedAt: "desc" },
    });
  }

  // ─── Medication admin log ─────────────────────────────────────────────────────

  async logMedicationAdmin(schoolId: string, data: {
    studentId: string; medicationName: string; dose: string;
    scheduledTime: Date; administeredAt?: Date; administeredBy?: string;
    missed?: boolean; notes?: string;
  }) {
    return this.prisma.medicationAdminLog.create({ data: { schoolId, ...data } });
  }

  async getMedicationLogs(schoolId: string, studentId: string) {
    return this.prisma.medicationAdminLog.findMany({
      where: { schoolId, studentId },
      orderBy: { scheduledTime: "desc" },
    });
  }

  // ─── Health incidents ─────────────────────────────────────────────────────────

  async reportIncident(schoolId: string, data: {
    studentId: string; injuryType: string; severity?: string;
    description: string; firstAidGiven?: string; referredTo?: string;
    parentNotified?: boolean; reportedBy: string;
  }) {
    return this.prisma.healthIncident.create({
      data: {
        schoolId, ...data,
        severity: data.severity ?? "MINOR",
        parentNotifiedAt: data.parentNotified ? new Date() : undefined,
      },
    });
  }

  async getIncidents(schoolId: string, studentId?: string) {
    return this.prisma.healthIncident.findMany({
      where: { schoolId, ...(studentId ? { studentId } : {}) },
      orderBy: { occurredAt: "desc" },
    });
  }

  // ─── Vaccinations ─────────────────────────────────────────────────────────────

  async upsertVaccination(studentId: string, data: {
    vaccineName: string; doseNumber?: number; administeredOn?: Date; dueDate?: Date;
  }) {
    return this.prisma.vaccinationRecord.create({ data: { studentId, ...data } });
  }

  async getVaccinations(studentId: string) {
    return this.prisma.vaccinationRecord.findMany({
      where: { studentId },
      orderBy: { dueDate: "asc" },
    });
  }

  /** Returns all students with overdue or upcoming vaccinations */
  async getVaccinationAlerts(schoolId: string) {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400_000);
    return this.prisma.vaccinationRecord.findMany({
      where: {
        student: { schoolId },
        administeredOn: null,
        dueDate: { lte: in30 },
      },
      include: { student: { include: { user: { include: { profile: true } } } } },
      orderBy: { dueDate: "asc" },
    });
  }

  // ─── Fitness / BMI records ────────────────────────────────────────────────────

  async recordFitness(data: {
    studentId: string; academicYear: string;
    heightCm?: number; weightKg?: number;
    visionLeft?: string; visionRight?: string;
    hearingLeft?: string; hearingRight?: string;
    recordedBy: string;
  }) {
    const bmi = data.heightCm && data.weightKg
      ? +(data.weightKg / ((data.heightCm / 100) ** 2)).toFixed(1)
      : undefined;

    return this.prisma.studentFitnessRecord.upsert({
      where: { studentId_academicYear: { studentId: data.studentId, academicYear: data.academicYear } },
      create: { ...data, bmi },
      update: { ...data, bmi },
    });
  }

  async getFitnessHistory(studentId: string) {
    return this.prisma.studentFitnessRecord.findMany({
      where: { studentId },
      orderBy: { recordedAt: "desc" },
    });
  }

  // ─── AED inventory ────────────────────────────────────────────────────────────

  async upsertAed(schoolId: string, data: {
    location: string; deviceModel?: string; serialNo?: string;
    padExpiryDate?: Date; batteryLevel?: number; trainedStaff?: string[];
  }) {
    return this.prisma.aedInventory.create({ data: { schoolId, ...data } });
  }

  async getAeds(schoolId: string) {
    return this.prisma.aedInventory.findMany({ where: { schoolId } });
  }

  // ─── Counselling sessions (confidential) ─────────────────────────────────────

  async createCounsellingSession(schoolId: string, data: {
    studentId: string; caseType: string; referralSource?: string;
    notes?: string; nextSession?: Date; counsellorId: string;
  }) {
    return this.prisma.counsellingSession.create({
      data: { schoolId, ...data, notesEncrypted: data.notes, isConfidential: true },
    });
  }

  async getCounsellingSessionsForStudent(schoolId: string, studentId: string) {
    return this.prisma.counsellingSession.findMany({
      where: { schoolId, studentId },
      orderBy: { sessionDate: "desc" },
    });
  }

  // ─── Discipline ───────────────────────────────────────────────────────────────

  async recordDisciplineIncident(schoolId: string, data: {
    studentId: string; description: string; action?: string;
    parentNotified?: boolean; counsellorReferred?: boolean; recordedBy: string;
  }) {
    return this.prisma.disciplineIncident.create({
      data: { schoolId, ...data, action: data.action ?? "WARNING" },
    });
  }

  async getDisciplineIncidents(schoolId: string, studentId?: string) {
    return this.prisma.disciplineIncident.findMany({
      where: { schoolId, ...(studentId ? { studentId } : {}) },
      orderBy: { occurredAt: "desc" },
    });
  }

  // ─── Anonymous mood check-in ──────────────────────────────────────────────────

  async submitMoodCheckIn(schoolId: string, moodScore: number, note?: string) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const flagged = moodScore <= 2; // distress threshold

    if (flagged) {
      // Production: notify counsellor without student identity
      console.log(`[MOOD ALERT] Distress check-in received for school ${schoolId} (score: ${moodScore})`);
    }

    return this.prisma.moodCheckIn.create({
      data: { schoolId, weekStart, moodScore, note, flaggedForCounsellor: flagged },
    });
  }

  async getMoodSummary(schoolId: string, weekStart: Date) {
    const logs = await this.prisma.moodCheckIn.findMany({
      where: { schoolId, weekStart },
    });
    const avg = logs.length > 0 ? +(logs.reduce((s, l) => s + l.moodScore, 0) / logs.length).toFixed(2) : null;
    const flagged = logs.filter((l) => l.flaggedForCounsellor).length;
    return { weekStart, totalResponses: logs.length, averageMood: avg, flaggedCount: flagged };
  }
}
