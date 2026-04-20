import { Test, TestingModule } from "@nestjs/testing";
import { AlertService } from "./alert.service";

const mockPrisma = {
  staff: { count: jest.fn() },
  student: { count: jest.fn() },
  emergencyAlert: {
    create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
  },
  alertAcknowledgement: { upsert: jest.fn() },
};

describe("AlertService", () => {
  let service: AlertService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<AlertService>(AlertService);
  });

  describe("broadcastAlert", () => {
    it("should create alert with total recipient count", async () => {
      mockPrisma.staff.count.mockResolvedValueOnce(50);
      mockPrisma.student.count.mockResolvedValueOnce(800);
      mockPrisma.emergencyAlert.create.mockResolvedValueOnce({
        id: "alert-1", totalRecipients: 850, status: "SENT",
      });
      const result = await service.broadcastAlert("sch-1", {
        alertType: "FIRE_DRILL", title: "Fire Drill", message: "Evacuate immediately",
        severity: "HIGH", sentBy: "admin-1",
      });
      expect(result.totalRecipients).toBe(850);
      expect(result.status).toBe("SENT");
    });

    it("should default severity to HIGH when not provided", async () => {
      mockPrisma.staff.count.mockResolvedValueOnce(10);
      mockPrisma.student.count.mockResolvedValueOnce(100);
      mockPrisma.emergencyAlert.create.mockResolvedValueOnce({ id: "alert-2", severity: "HIGH" });
      await service.broadcastAlert("sch-1", {
        alertType: "GENERAL", title: "Notice", message: "School closed", sentBy: "admin-1",
      });
      expect(mockPrisma.emergencyAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ severity: "HIGH" }) })
      );
    });
  });

  describe("getAlerts", () => {
    it("should return alerts for school ordered by sentAt desc", async () => {
      mockPrisma.emergencyAlert.findMany.mockResolvedValueOnce([{ id: "alert-1" }, { id: "alert-2" }]);
      const result = await service.getAlerts("sch-1");
      expect(result).toHaveLength(2);
      expect(mockPrisma.emergencyAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { sentAt: "desc" } })
      );
    });
  });

  describe("acknowledgeAlert", () => {
    it("should upsert acknowledgement for user", async () => {
      mockPrisma.alertAcknowledgement.upsert.mockResolvedValueOnce({ alertId: "alert-1", userId: "user-1" });
      const result = await service.acknowledgeAlert("alert-1", "user-1");
      expect(mockPrisma.alertAcknowledgement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { alertId_userId: { alertId: "alert-1", userId: "user-1" } } })
      );
    });
  });

  describe("getAcknowledgementStatus", () => {
    it("should return alert with acknowledgement count", async () => {
      mockPrisma.emergencyAlert.findUnique.mockResolvedValueOnce({
        id: "alert-1", totalRecipients: 100, _count: { acknowledgements: 75 },
      });
      const result = await service.getAcknowledgementStatus("alert-1");
      expect(result).toBeDefined();
    });
  });
});
