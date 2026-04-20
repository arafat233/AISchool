import { Test, TestingModule } from "@nestjs/testing";
import { CalendarService } from "./calendar.service";

const mockPrisma = {
  academicCalendarEvent: {
    create: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn(),
  },
};

describe("CalendarService", () => {
  let service: CalendarService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalendarService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<CalendarService>(CalendarService);
  });

  describe("createEvent", () => {
    it("should create a calendar event", async () => {
      mockPrisma.academicCalendarEvent.create.mockResolvedValueOnce({
        id: "ev-1", title: "Annual Day", type: "EVENT",
      });
      const result = await service.createEvent("sch-1", {
        title: "Annual Day", date: new Date("2026-11-15"), type: "EVENT", createdBy: "admin-1",
      });
      expect(result.id).toBe("ev-1");
      expect(mockPrisma.academicCalendarEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: "Annual Day" }) })
      );
    });
  });

  describe("getEvents", () => {
    it("should return events for school", async () => {
      mockPrisma.academicCalendarEvent.findMany.mockResolvedValueOnce([
        { id: "ev-1", isHoliday: false }, { id: "ev-2", isHoliday: true },
      ]);
      const result = await service.getEvents("sch-1");
      expect(result).toHaveLength(2);
    });

    it("should filter by date range when provided", async () => {
      mockPrisma.academicCalendarEvent.findMany.mockResolvedValueOnce([]);
      const from = new Date("2026-06-01");
      const to = new Date("2026-06-30");
      await service.getEvents("sch-1", from, to);
      expect(mockPrisma.academicCalendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ date: { gte: from, lte: to } }),
        })
      );
    });

    it("should filter by type when provided", async () => {
      mockPrisma.academicCalendarEvent.findMany.mockResolvedValueOnce([]);
      await service.getEvents("sch-1", undefined, undefined, "HOLIDAY");
      expect(mockPrisma.academicCalendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ type: "HOLIDAY" }) })
      );
    });
  });

  describe("updateEvent", () => {
    it("should update and return the event", async () => {
      mockPrisma.academicCalendarEvent.update.mockResolvedValueOnce({ id: "ev-1", title: "Updated" });
      const result = await service.updateEvent("ev-1", { title: "Updated" });
      expect(result.title).toBe("Updated");
    });
  });

  describe("deleteEvent", () => {
    it("should delete the event", async () => {
      mockPrisma.academicCalendarEvent.delete.mockResolvedValueOnce({ id: "ev-1" });
      await service.deleteEvent("ev-1");
      expect(mockPrisma.academicCalendarEvent.delete).toHaveBeenCalledWith({ where: { id: "ev-1" } });
    });
  });

  describe("generateICal", () => {
    it("should produce valid iCal format with BEGIN:VCALENDAR", async () => {
      mockPrisma.academicCalendarEvent.findMany.mockResolvedValueOnce([
        { id: "ev-1", title: "Annual Day", date: new Date("2026-11-15"), description: null },
      ]);
      const ical = await service.generateICal("sch-1");
      expect(ical).toContain("BEGIN:VCALENDAR");
      expect(ical).toContain("END:VCALENDAR");
      expect(ical).toContain("Annual Day");
    });
  });
});
