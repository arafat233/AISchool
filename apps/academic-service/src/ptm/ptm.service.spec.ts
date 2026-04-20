import { Test, TestingModule } from "@nestjs/testing";
import { PtmService } from "./ptm.service";

const mockPrisma = {
  ptmEvent: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
  ptmSlot: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
};

describe("PtmService", () => {
  let service: PtmService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PtmService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<PtmService>(PtmService);
  });

  describe("createEvent", () => {
    it("should create PTM event with SCHEDULED status", async () => {
      mockPrisma.ptmEvent.create.mockResolvedValueOnce({ id: "ptm-1", status: "SCHEDULED" });
      const result = await service.createEvent("sch-1", {
        title: "Term 1 PTM", eventDate: new Date("2026-06-01"),
        slotDurationMinutes: 15, createdBy: "admin-1",
      });
      expect(result.id).toBe("ptm-1");
      expect(result.status).toBe("SCHEDULED");
    });
  });

  describe("setupTeacherSlots", () => {
    it("should throw NotFoundError when PTM event not found", async () => {
      mockPrisma.ptmEvent.findUnique.mockResolvedValueOnce(null);
      await expect(service.setupTeacherSlots("nonexistent", "staff-1", {
        startTime: new Date(), endTime: new Date(),
      })).rejects.toThrow();
    });

    it("should create slots for teacher within time range", async () => {
      mockPrisma.ptmEvent.findUnique.mockResolvedValueOnce({ id: "ptm-1", slotDurationMinutes: 15 });
      mockPrisma.ptmSlot.create.mockResolvedValue({ id: "slot-1" });
      const start = new Date("2026-06-01T09:00:00");
      const end = new Date("2026-06-01T10:00:00");
      await service.setupTeacherSlots("ptm-1", "staff-1", { startTime: start, endTime: end });
      // 60 min / 15 min = 4 slots
      expect(mockPrisma.ptmSlot.create).toHaveBeenCalledTimes(4);
    });
  });

  describe("bookSlot", () => {
    it("should book an available slot", async () => {
      mockPrisma.ptmSlot.findFirst.mockResolvedValueOnce({ id: "slot-1", isBooked: false });
      mockPrisma.ptmSlot.update.mockResolvedValueOnce({ id: "slot-1", isBooked: true, bookedByParentId: "parent-1" });
      const result = await service.bookSlot("slot-1", "parent-1", "stu-1");
      expect(result.isBooked).toBe(true);
    });

    it("should throw ConflictError when slot already booked", async () => {
      mockPrisma.ptmSlot.findFirst.mockResolvedValueOnce({ id: "slot-1", isBooked: true });
      await expect(service.bookSlot("slot-1", "parent-1", "stu-1")).rejects.toThrow();
    });
  });

  describe("getPtmEvents", () => {
    it("should return all PTM events for school", async () => {
      mockPrisma.ptmEvent.findMany.mockResolvedValueOnce([{ id: "ptm-1" }, { id: "ptm-2" }]);
      const result = await service.getPtmEvents("sch-1");
      expect(result).toHaveLength(2);
    });
  });
});
