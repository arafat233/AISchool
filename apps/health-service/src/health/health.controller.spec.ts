import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

const mockUser = { id: "user1", schoolId: "school1", tenantId: "tenant1" };

const mockHealthService = {
  upsertMedicalProfile: jest.fn(),
  getMedicalProfile: jest.fn(),
  logNurseVisit: jest.fn(),
  getNurseVisits: jest.fn(),
  logMedicationAdmin: jest.fn(),
  getMedicationLogs: jest.fn(),
  reportIncident: jest.fn(),
  getIncidents: jest.fn(),
  upsertVaccination: jest.fn(),
  getVaccinations: jest.fn(),
  getVaccinationAlerts: jest.fn(),
  recordFitness: jest.fn(),
  getFitnessHistory: jest.fn(),
  upsertAed: jest.fn(),
  getAeds: jest.fn(),
  createCounsellingSession: jest.fn(),
  getCounsellingSessionsForStudent: jest.fn(),
  recordDisciplineIncident: jest.fn(),
  getDisciplineIncidents: jest.fn(),
  submitMoodCheckIn: jest.fn(),
  getMoodSummary: jest.fn(),
};

function makeReq(overrides: Partial<typeof mockUser> = {}) {
  return { user: { ...mockUser, ...overrides } };
}

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealthService }],
    })
      .overrideGuard(require("@nestjs/passport").AuthGuard("jwt"))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<HealthController>(HealthController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ─── Medical Profile ───────────────────────────────────────────────────────

  describe("upsertProfile", () => {
    it("delegates to service with studentId", async () => {
      const profile = { studentId: "s1" };
      mockHealthService.upsertMedicalProfile.mockResolvedValue(profile);
      const dto = { bloodGroup: "A+" } as any;
      expect(await controller.upsertProfile("s1", dto)).toEqual(profile);
      expect(mockHealthService.upsertMedicalProfile).toHaveBeenCalledWith("s1", dto);
    });

    it("propagates service errors", async () => {
      mockHealthService.upsertMedicalProfile.mockRejectedValue(new Error("DB error"));
      await expect(controller.upsertProfile("s1", {} as any)).rejects.toThrow("DB error");
    });
  });

  describe("getProfile", () => {
    it("returns medical profile for student", async () => {
      const profile = { studentId: "s1", bloodGroup: "O+" };
      mockHealthService.getMedicalProfile.mockResolvedValue(profile);
      expect(await controller.getProfile("s1")).toEqual(profile);
      expect(mockHealthService.getMedicalProfile).toHaveBeenCalledWith("s1");
    });
  });

  // ─── Nurse Visits ──────────────────────────────────────────────────────────

  describe("logVisit", () => {
    it("passes schoolId from JWT user to service", async () => {
      const visit = { id: "v1" };
      mockHealthService.logNurseVisit.mockResolvedValue(visit);
      const dto = { studentId: "s1", complaint: "Headache" } as any;
      const req = makeReq() as any;
      expect(await controller.logVisit(req, dto)).toEqual(visit);
      expect(mockHealthService.logNurseVisit).toHaveBeenCalledWith(
        "school1",
        expect.objectContaining({ attendedBy: "user1" }),
      );
    });
  });

  describe("getVisits", () => {
    it("passes schoolId from JWT user to service", async () => {
      const visits = [{ id: "v1" }];
      mockHealthService.getNurseVisits.mockResolvedValue(visits);
      const req = makeReq() as any;
      expect(await controller.getVisits(req, "s1")).toEqual(visits);
      expect(mockHealthService.getNurseVisits).toHaveBeenCalledWith("school1", "s1");
    });
  });

  // ─── Medication ────────────────────────────────────────────────────────────

  describe("logMedication", () => {
    it("passes schoolId from JWT and converts dates", async () => {
      const log = { id: "ml1" };
      mockHealthService.logMedicationAdmin.mockResolvedValue(log);
      const dto = { studentId: "s1", medicineName: "Paracetamol", scheduledTime: "2025-01-01T10:00:00Z", dosageMg: 500 } as any;
      const req = makeReq() as any;
      expect(await controller.logMedication(req, dto)).toEqual(log);
      expect(mockHealthService.logMedicationAdmin).toHaveBeenCalledWith(
        "school1",
        expect.objectContaining({ scheduledTime: expect.any(Date) }),
      );
    });
  });

  // ─── Incidents ─────────────────────────────────────────────────────────────

  describe("reportIncident", () => {
    it("injects reportedBy from JWT user", async () => {
      mockHealthService.reportIncident.mockResolvedValue({ id: "inc1" });
      const dto = { studentId: "s1", description: "Fall" } as any;
      const req = makeReq() as any;
      await controller.reportIncident(req, dto);
      expect(mockHealthService.reportIncident).toHaveBeenCalledWith(
        "school1",
        expect.objectContaining({ reportedBy: "user1" }),
      );
    });
  });

  describe("getIncidents", () => {
    it("passes schoolId from JWT user", async () => {
      mockHealthService.getIncidents.mockResolvedValue([]);
      const req = makeReq() as any;
      await controller.getIncidents(req, "s1");
      expect(mockHealthService.getIncidents).toHaveBeenCalledWith("school1", "s1");
    });
  });

  // ─── Vaccinations ──────────────────────────────────────────────────────────

  describe("addVaccination", () => {
    it("delegates to service with studentId and converts dates", async () => {
      mockHealthService.upsertVaccination.mockResolvedValue({ id: "vac1" });
      const dto = { vaccineName: "BCG", administeredOn: "2025-01-01", dueDate: "2026-01-01" } as any;
      await controller.addVaccination("s1", dto);
      expect(mockHealthService.upsertVaccination).toHaveBeenCalledWith(
        "s1",
        expect.objectContaining({ administeredOn: expect.any(Date), dueDate: expect.any(Date) }),
      );
    });
  });

  describe("getVaccinationAlerts", () => {
    it("passes schoolId from JWT user", async () => {
      mockHealthService.getVaccinationAlerts.mockResolvedValue([]);
      const req = makeReq() as any;
      await controller.getVaccinationAlerts(req);
      expect(mockHealthService.getVaccinationAlerts).toHaveBeenCalledWith("school1");
    });
  });

  // ─── Fitness ───────────────────────────────────────────────────────────────

  describe("recordFitness", () => {
    it("injects recordedBy from JWT user", async () => {
      mockHealthService.recordFitness.mockResolvedValue({ id: "fit1" });
      const dto = { studentId: "s1", bmi: 22 } as any;
      const req = makeReq() as any;
      await controller.recordFitness(req, dto);
      expect(mockHealthService.recordFitness).toHaveBeenCalledWith(
        expect.objectContaining({ recordedBy: "user1" }),
      );
    });
  });

  // ─── AED ───────────────────────────────────────────────────────────────────

  describe("createAed", () => {
    it("passes schoolId from JWT user and converts date", async () => {
      mockHealthService.upsertAed.mockResolvedValue({ id: "aed1" });
      const dto = { location: "Office", padExpiryDate: "2026-01-01" } as any;
      const req = makeReq() as any;
      await controller.createAed(req, dto);
      expect(mockHealthService.upsertAed).toHaveBeenCalledWith(
        "school1",
        expect.objectContaining({ padExpiryDate: expect.any(Date) }),
      );
    });
  });

  // ─── Counselling ───────────────────────────────────────────────────────────

  describe("createSession", () => {
    it("injects counsellorId from JWT user", async () => {
      mockHealthService.createCounsellingSession.mockResolvedValue({ id: "cs1" });
      const dto = { studentId: "s1", sessionType: "ACADEMIC", notes: "Stress" } as any;
      const req = makeReq() as any;
      await controller.createSession(req, dto);
      expect(mockHealthService.createCounsellingSession).toHaveBeenCalledWith(
        "school1",
        expect.objectContaining({ counsellorId: "user1" }),
      );
    });
  });

  // ─── Discipline ────────────────────────────────────────────────────────────

  describe("recordDiscipline", () => {
    it("injects recordedBy from JWT user", async () => {
      mockHealthService.recordDisciplineIncident.mockResolvedValue({ id: "disc1" });
      const dto = { studentId: "s1", incidentType: "BULLYING" } as any;
      const req = makeReq() as any;
      await controller.recordDiscipline(req, dto);
      expect(mockHealthService.recordDisciplineIncident).toHaveBeenCalledWith(
        "school1",
        expect.objectContaining({ recordedBy: "user1" }),
      );
    });
  });

  // ─── Mood ──────────────────────────────────────────────────────────────────

  describe("submitMood", () => {
    it("passes schoolId from JWT user", async () => {
      mockHealthService.submitMoodCheckIn.mockResolvedValue({ id: "mood1" });
      const req = makeReq() as any;
      await controller.submitMood(req, 4, "Feeling good");
      expect(mockHealthService.submitMoodCheckIn).toHaveBeenCalledWith("school1", 4, "Feeling good");
    });
  });

  describe("getMoodSummary", () => {
    it("passes schoolId from JWT and converted week start date", async () => {
      mockHealthService.getMoodSummary.mockResolvedValue({ average: 4 });
      const req = makeReq() as any;
      await controller.getMoodSummary(req, "2025-01-06");
      expect(mockHealthService.getMoodSummary).toHaveBeenCalledWith("school1", expect.any(Date));
    });
  });
});
