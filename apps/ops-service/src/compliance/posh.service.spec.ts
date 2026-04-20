import { Test, TestingModule } from "@nestjs/testing";
import { PoshService } from "./posh.service";

const mockPrisma = {
  $executeRaw: jest.fn().mockResolvedValue(1),
  $queryRaw: jest.fn().mockResolvedValue([]),
};

describe("PoshService", () => {
  let service: PoshService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PoshService, { provide: require("../prisma/prisma.service").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<PoshService>(PoshService);
  });

  describe("fileComplaint", () => {
    it("should return complaint number and 90-day deadline", async () => {
      const result = await service.fileComplaint("sch-1", {
        respondentId: "staff-2",
        anonymous: false,
        description: "Inappropriate comment",
        incidentDate: new Date("2026-04-01"),
        incidentLocation: "Staffroom",
        severity: "MODERATE",
      });

      expect(result.complaintNo).toMatch(/^POSH-/);
      const diff = result.deadline.getTime() - Date.now();
      expect(diff).toBeGreaterThan(89 * 86400000);
      expect(diff).toBeLessThan(91 * 86400000);
    });

    it("should generate unique complaint number each time", async () => {
      const r1 = await service.fileComplaint("sch-1", {
        respondentId: "s-1", anonymous: true, description: "Incident A",
        incidentDate: new Date(), incidentLocation: "Hallway", severity: "MINOR",
      });
      const r2 = await service.fileComplaint("sch-1", {
        respondentId: "s-2", anonymous: false, description: "Incident B",
        incidentDate: new Date(), incidentLocation: "Classroom", severity: "SEVERE",
      });
      expect(r1.complaintNo).not.toBe(r2.complaintNo);
    });
  });

  describe("reportPocsOIncident", () => {
    it("should return incident ref and 24-hour filing deadline", async () => {
      const discoveryDate = new Date();
      const result = await service.reportPocsOIncident("sch-1", {
        dslId: "dsl-1",
        victimStudentId: "stu-1",
        allegedPerpetrator: "Unknown adult",
        incidentDate: new Date("2026-04-10"),
        discoveryDate,
        description: "Disclosure by student",
        immediateActionsToken: ["Parent notified", "Student counselled"],
      });

      expect(result.incidentRef).toMatch(/^POCSO-/);
      const diff = result.filingDeadline.getTime() - discoveryDate.getTime();
      expect(diff).toBe(24 * 3600000);
    });
  });

  describe("generateAnnualReport", () => {
    it("should return report with year and dueDate", async () => {
      const result = await service.generateAnnualReport("sch-1", 2025);
      expect(result.year).toBe(2025);
      expect(result.dueDate).toBe("2026-01-31");
    });
  });

  describe("getComplaints", () => {
    it("should call $queryRaw and return results", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ complaint_no: "POSH-SCH1-123456", status: "RECEIVED" }]);
      const result = await service.getComplaints("sch-1");
      expect(result).toHaveLength(1);
    });
  });
});
