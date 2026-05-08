import { Test, TestingModule } from "@nestjs/testing";
import { TenantService } from "./tenant.service";
import { SaasNotificationService } from "../notification/saas-notification.service";
import { NotFoundException } from "@nestjs/common";

const mockNotify = { send: jest.fn().mockResolvedValue(undefined) };

const mockPrisma = {
  saasInvoice: { count: jest.fn() },
  tenant: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
  school: { findMany: jest.fn() },
};

describe("TenantService", () => {
  let service: TenantService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma },
        { provide: SaasNotificationService, useValue: mockNotify },
      ],
    }).compile();
    service = module.get<TenantService>(TenantService);
  });

  describe("createTenant", () => {
    it("should create tenant with TRIAL status and 30-day trial", async () => {
      mockPrisma.tenant.create.mockResolvedValueOnce({
        id: "tenant-1", status: "TRIAL", plan: "BASIC",
        featureFlags: ["attendance", "fee", "student", "academic", "notification"],
      });
      const result = await service.createTenant({
        name: "Springfield School", contactEmail: "info@springfield.edu",
        contactPhone: "9876543210", city: "Mumbai", state: "Maharashtra",
      });
      expect(result.status).toBe("TRIAL");
      const call = mockPrisma.tenant.create.mock.calls[0][0];
      expect(call.data.status).toBe("TRIAL");
      const trialDiff = call.data.trialEndsAt.getTime() - Date.now();
      expect(trialDiff).toBeGreaterThan(29 * 86400000);
    });

    it("should set BASIC plan features when plan not specified", async () => {
      mockPrisma.tenant.create.mockResolvedValueOnce({ id: "t-1", plan: "BASIC" });
      await service.createTenant({ name: "School B", contactEmail: "b@school.edu", contactPhone: "123", city: "Delhi", state: "Delhi" });
      const call = mockPrisma.tenant.create.mock.calls[0][0];
      expect(call.data.featureFlags).toContain("attendance");
      expect(call.data.featureFlags).toContain("fee");
    });
  });

  describe("getTenant", () => {
    it("should return tenant when found", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: "t-1", name: "School A" });
      const result = await service.getTenant("t-1");
      expect(result.name).toBe("School A");
    });

    it("should throw NotFoundException when tenant not found", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);
      await expect(service.getTenant("nonexistent")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("changePlan", () => {
    it("should update plan and featureFlags", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({ id: "t-1" });
      mockPrisma.tenant.update.mockResolvedValueOnce({ id: "t-1", plan: "PREMIUM" });
      const result = await service.changePlan("t-1", { plan: "PREMIUM" as any });
      expect(result.plan).toBe("PREMIUM");
      const call = mockPrisma.tenant.update.mock.calls[0][0];
      expect(call.data.featureFlags).toContain("library");
    });
  });

  describe("listTenants", () => {
    it("should filter by status when provided", async () => {
      mockPrisma.tenant.findMany.mockResolvedValueOnce([]);
      await service.listTenants("ACTIVE");
      expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "ACTIVE" } })
      );
    });
  });

  describe("suspendTenant", () => {
    it("should suspend tenant and send SUSPENSION_NOTICE notification", async () => {
      mockPrisma.tenant.findUnique
        .mockResolvedValueOnce({ id: "t-1", name: "School A", contactEmail: "admin@school.in" }) // getTenant in suspendTenant
        .mockResolvedValueOnce({ id: "t-1", name: "School A" }); // getTenant inside updateStatus
      mockPrisma.tenant.update.mockResolvedValueOnce({ id: "t-1", status: "SUSPENDED" });

      await service.suspendTenant("t-1", "Overdue payment");
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "SUSPENDED" }) })
      );
      expect(mockNotify.send).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: "SUSPENSION_NOTICE", to: "admin@school.in" })
      );
    });
  });
});
