import { Test, TestingModule } from "@nestjs/testing";
import { FacilityService } from "./facility.service";
import { PrismaService } from "@school-erp/database";

const mockPrisma = {
  maintenanceRequest: {
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  preventiveMaintenance: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  roomBooking: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  utilityBill: { create: jest.fn(), findMany: jest.fn() },
  lostFoundItem: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

describe("FacilityService", () => {
  let service: FacilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FacilityService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(FacilityService);
    jest.clearAllMocks();
  });

  // ─── submitRequest ───────────────────────────────────────────────────────────

  describe("submitRequest", () => {
    it("calculates SLA deadline based on category", async () => {
      const request = { id: "r1" };
      mockPrisma.maintenanceRequest.create.mockResolvedValue(request);

      await service.submitRequest("s1", "u1", {
        location: "Room 101", issueType: "Broken tap", category: "PLUMBING", description: "Leaking",
      });

      // PLUMBING SLA = 2 hours
      expect(mockPrisma.maintenanceRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slaDeadline: expect.any(Date),
            category: "PLUMBING",
          }),
        }),
      );
      const call = mockPrisma.maintenanceRequest.create.mock.calls[0][0];
      const slaMs = call.data.slaDeadline.getTime() - Date.now();
      // SLA should be ~2h = 7_200_000 ms
      expect(slaMs).toBeGreaterThan(7_000_000);
      expect(slaMs).toBeLessThan(7_500_000);
    });

    it("falls back to 24h SLA for unknown category", async () => {
      mockPrisma.maintenanceRequest.create.mockResolvedValue({ id: "r2" });
      await service.submitRequest("s1", "u1", {
        location: "Hall", issueType: "Other", category: "UNKNOWN", description: "Issue",
      });
      const call = mockPrisma.maintenanceRequest.create.mock.calls[0][0];
      const slaMs = call.data.slaDeadline.getTime() - Date.now();
      // 24h = 86_400_000 ms
      expect(slaMs).toBeGreaterThan(85_000_000);
      expect(slaMs).toBeLessThan(87_000_000);
    });
  });

  // ─── assignRequest ───────────────────────────────────────────────────────────

  describe("assignRequest", () => {
    it("sets status to ASSIGNED and stores assignee", async () => {
      mockPrisma.maintenanceRequest.update.mockResolvedValue({});
      await service.assignRequest("r1", "worker1");
      expect(mockPrisma.maintenanceRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "ASSIGNED", assignedTo: "worker1" } }),
      );
    });
  });

  // ─── resolveRequest ──────────────────────────────────────────────────────────

  describe("resolveRequest", () => {
    it("sets status to RESOLVED with resolvedAt timestamp", async () => {
      mockPrisma.maintenanceRequest.update.mockResolvedValue({});
      await service.resolveRequest("r1", "Fixed the tap");
      expect(mockPrisma.maintenanceRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "RESOLVED",
            resolvedAt: expect.any(Date),
            resolutionNotes: "Fixed the tap",
          }),
        }),
      );
    });
  });
});
