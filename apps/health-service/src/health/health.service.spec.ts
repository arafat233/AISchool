import { Test, TestingModule } from "@nestjs/testing";
import { HealthService } from "./health.service";

const mockPrisma = {
  studentMedicalProfile: { upsert: jest.fn(), findUnique: jest.fn() },
  nurseVisitLog: { create: jest.fn(), findMany: jest.fn() },
  medicationAdminLog: { create: jest.fn() },
  vaccinationRecord: { create: jest.fn(), findMany: jest.fn() },
  vaccinationSchedule: { findMany: jest.fn() },
  healthIncident: { create: jest.fn() },
};

describe("HealthService", () => {
  let service: HealthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<HealthService>(HealthService);
  });

  describe("upsertMedicalProfile", () => {
    it("should upsert profile for student", async () => {
      mockPrisma.studentMedicalProfile.upsert.mockResolvedValueOnce({
        studentId: "stu-1", bloodGroup: "O+",
      });
      const result = await service.upsertMedicalProfile("stu-1", { bloodGroup: "O+" });
      expect(result.bloodGroup).toBe("O+");
    });
  });

  describe("getMedicalProfile", () => {
    it("should return profile for student", async () => {
      mockPrisma.studentMedicalProfile.findUnique.mockResolvedValueOnce({
        studentId: "stu-1", allergies: ["Peanuts"],
      });
      const result = await service.getMedicalProfile("stu-1");
      expect(result?.allergies).toContain("Peanuts");
    });

    it("should return null when no profile", async () => {
      mockPrisma.studentMedicalProfile.findUnique.mockResolvedValueOnce(null);
      const result = await service.getMedicalProfile("stu-1");
      expect(result).toBeNull();
    });
  });

  describe("logNurseVisit", () => {
    it("should create visit with default disposition RETURNED_TO_CLASS", async () => {
      mockPrisma.nurseVisitLog.create.mockResolvedValueOnce({
        id: "visit-1", disposition: "RETURNED_TO_CLASS",
      });
      const result = await service.logNurseVisit("sch-1", {
        studentId: "stu-1", complaint: "Headache",
        attendedBy: "nurse-1",
      });
      expect(result.disposition).toBe("RETURNED_TO_CLASS");
    });

    it("should set parentNotifiedAt when parentNotified=true", async () => {
      mockPrisma.nurseVisitLog.create.mockResolvedValueOnce({ id: "visit-2" });
      await service.logNurseVisit("sch-1", {
        studentId: "stu-1", complaint: "High fever",
        attendedBy: "nurse-1", parentNotified: true,
      });
      const createCall = mockPrisma.nurseVisitLog.create.mock.calls[0][0];
      expect(createCall.data.parentNotifiedAt).toBeInstanceOf(Date);
    });
  });

  describe("getNurseVisits", () => {
    it("should filter by studentId when provided", async () => {
      mockPrisma.nurseVisitLog.findMany.mockResolvedValueOnce([]);
      await service.getNurseVisits("sch-1", "stu-1");
      expect(mockPrisma.nurseVisitLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ studentId: "stu-1" }) })
      );
    });
  });

  describe("logMedicationAdmin", () => {
    it("should create medication log", async () => {
      mockPrisma.medicationAdminLog.create.mockResolvedValueOnce({ id: "med-1" });
      const result = await service.logMedicationAdmin("sch-1", {
        studentId: "stu-1", medicationName: "Paracetamol",
        dose: "500mg", scheduledTime: new Date(),
      });
      expect(result.id).toBe("med-1");
    });
  });
});
