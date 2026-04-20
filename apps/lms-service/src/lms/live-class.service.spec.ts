import { Test, TestingModule } from "@nestjs/testing";
import { LiveClassService } from "./live-class.service";
import { NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  lesson: { findUnique: jest.fn(), update: jest.fn() },
  liveClass: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
};

describe("LiveClassService", () => {
  let service: LiveClassService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiveClassService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<LiveClassService>(LiveClassService);
  });

  describe("scheduleLiveClass", () => {
    it("should create live class with meeting link and SCHEDULED status", async () => {
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({ id: "lesson-1" });
      mockPrisma.liveClass.create.mockResolvedValueOnce({
        id: "lc-1", status: "SCHEDULED", meetingLink: "https://zoom.us/j/abc123",
      });
      mockPrisma.lesson.update.mockResolvedValueOnce({});

      const result = await service.scheduleLiveClass({
        lessonId: "lesson-1", title: "Math Live", scheduledAt: new Date(),
        durationMinutes: 45, provider: "ZOOM", hostStaffId: "staff-1",
      });
      expect(result.status).toBe("SCHEDULED");
      expect(result.meetingLink).toContain("zoom.us");
    });

    it("should generate correct meeting link for Google Meet", async () => {
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({ id: "lesson-1" });
      mockPrisma.liveClass.create.mockImplementationOnce((args: any) => ({
        id: "lc-2", status: "SCHEDULED", meetingLink: args.data.meetingLink,
      }));
      mockPrisma.lesson.update.mockResolvedValueOnce({});

      const result = await service.scheduleLiveClass({
        lessonId: "lesson-1", title: "Science Live", scheduledAt: new Date(),
        durationMinutes: 40, provider: "GOOGLE_MEET", hostStaffId: "staff-1",
      });
      expect(result.meetingLink).toContain("meet.google.com");
    });

    it("should throw NotFoundError when lesson not found", async () => {
      mockPrisma.lesson.findUnique.mockResolvedValueOnce(null);
      await expect(service.scheduleLiveClass({
        lessonId: "nonexistent", title: "Class", scheduledAt: new Date(),
        durationMinutes: 30, provider: "ZOOM", hostStaffId: "staff-1",
      })).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
