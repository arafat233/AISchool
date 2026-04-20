import { Test, TestingModule } from "@nestjs/testing";
import { AttendanceService } from "./attendance.service";

jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({}),
  })),
}));
jest.mock("@school-erp/events", () => ({
  QUEUES: { ATTENDANCE_ALERT: "attendance-alert" },
  DEFAULT_JOB_OPTIONS: {},
}));
jest.mock("@school-erp/utils", () => ({
  startOfDay: jest.fn((d) => d),
  endOfDay: jest.fn((d) => d),
  startOfMonth: jest.fn((d) => d),
  endOfMonth: jest.fn((d) => d),
}));

const mockPrisma = {
  attendanceSession: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  attendanceRecord: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
  staffAttendance: { create: jest.fn(), findMany: jest.fn() },
};

describe("AttendanceService", () => {
  let service: AttendanceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttendanceService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<AttendanceService>(AttendanceService);
  });

  describe("createSession", () => {
    it("should create new session when none exists", async () => {
      mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce(null);
      mockPrisma.attendanceSession.create.mockResolvedValueOnce({ id: "sess-1" });
      const result = await service.createSession("sch-1", {
        sectionId: "sec-1", date: "2026-04-20", createdById: "teacher-1",
      });
      expect(result.id).toBe("sess-1");
    });

    it("should return existing session without creating duplicate", async () => {
      mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({ id: "sess-existing" });
      const result = await service.createSession("sch-1", {
        sectionId: "sec-1", date: "2026-04-20", createdById: "teacher-1",
      });
      expect(result.id).toBe("sess-existing");
      expect(mockPrisma.attendanceSession.create).not.toHaveBeenCalled();
    });
  });

  describe("bulkMark", () => {
    it("should upsert records and return summary counts", async () => {
      mockPrisma.attendanceSession.findUniqueOrThrow.mockResolvedValueOnce({
        id: "sess-1", sectionId: "sec-1", date: new Date(),
        section: { id: "sec-1" },
      });
      mockPrisma.$transaction.mockResolvedValueOnce([]);
      mockPrisma.attendanceSession.update.mockResolvedValueOnce({ id: "sess-1" });

      const result = await service.bulkMark("sess-1", {
        records: [
          { studentId: "stu-1", status: "PRESENT" },
          { studentId: "stu-2", status: "ABSENT" },
          { studentId: "stu-3", status: "PRESENT" },
        ],
      } as any, "teacher-1");

      expect(result.total).toBe(3);
      expect(result.absent).toBe(1);
      expect(result.present).toBe(2);
    });

    it("should enqueue notification job when absences exist", async () => {
      mockPrisma.attendanceSession.findUniqueOrThrow.mockResolvedValueOnce({
        id: "sess-1", sectionId: "sec-1", date: new Date(), section: {},
      });
      mockPrisma.$transaction.mockResolvedValueOnce([]);
      mockPrisma.attendanceSession.update.mockResolvedValueOnce({});

      await service.bulkMark("sess-1", {
        records: [{ studentId: "stu-1", status: "ABSENT" }],
      } as any, "teacher-1");

      const queue = (require("bullmq").Queue as jest.Mock).mock.results[0].value;
      expect(queue.add).toHaveBeenCalledWith("attendance-absent", expect.any(Object), expect.any(Object));
    });
  });

  describe("getStudentSummary", () => {
    it("should calculate attendance percentage correctly", async () => {
      mockPrisma.attendanceRecord.findMany.mockResolvedValueOnce([
        { status: "PRESENT", session: { date: new Date() } },
        { status: "PRESENT", session: { date: new Date() } },
        { status: "ABSENT", session: { date: new Date() } },
        { status: "ABSENT", session: { date: new Date() } },
      ]);
      const result = await service.getStudentSummary("stu-1", "2026-04-01", "2026-04-30");
      expect(result.total).toBe(4);
      expect(result.present).toBe(2);
      expect(result.absent).toBe(2);
      expect(result.percentage).toBe(50);
    });

    it("should return 0% when no records", async () => {
      mockPrisma.attendanceRecord.findMany.mockResolvedValueOnce([]);
      const result = await service.getStudentSummary("stu-1", "2026-04-01", "2026-04-30");
      expect(result.percentage).toBe(0);
    });
  });
});
