import { Test, TestingModule } from "@nestjs/testing";
import { HomeworkService } from "./homework.service";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  homework: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
  },
  homeworkAcknowledgement: {
    upsert: jest.fn(),
  },
};

describe("HomeworkService", () => {
  let service: HomeworkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeworkService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<HomeworkService>(HomeworkService);
  });

  beforeEach(() => jest.clearAllMocks());

  // ─── createAssignment (postHomework) ─────────────────────────────────────────

  describe("postHomework", () => {
    it("creates homework with a due date in the future", async () => {
      const tomorrow = new Date(Date.now() + 86400000);
      const created = {
        id: "hw-1",
        description: "Read chapter 5",
        dueDate: tomorrow,
        subject: { name: "Science" },
        class: { name: "Grade 5" },
      };
      mockPrisma.homework.create.mockResolvedValue(created);

      const result = await service.postHomework({
        schoolId: "school-1",
        teacherStaffId: "staff-1",
        classId: "gl-1",
        subjectId: "subj-1",
        description: "Read chapter 5",
        dueDate: tomorrow,
      });

      expect(mockPrisma.homework.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: "school-1",
          teacherStaffId: "staff-1",
          gradeLevelId: "gl-1",
          subjectId: "subj-1",
          description: "Read chapter 5",
          dueDate: tomorrow,
          requiresAcknowledgement: false,
        }),
        include: { subject: true, class: true },
      });
      expect(result).toEqual(created);
    });

    it("stores assignedDate as now when not provided", async () => {
      const dueDate = new Date(Date.now() + 86400000);
      mockPrisma.homework.create.mockResolvedValue({ id: "hw-2" });

      await service.postHomework({
        schoolId: "school-1",
        teacherStaffId: "staff-1",
        classId: "gl-1",
        subjectId: "subj-1",
        description: "Solve exercise 3",
        dueDate,
      });

      const callArgs = mockPrisma.homework.create.mock.calls[0][0].data;
      expect(callArgs.assignedDate).toBeInstanceOf(Date);
    });

    it("sets requiresAcknowledgement when provided", async () => {
      const dueDate = new Date(Date.now() + 86400000);
      mockPrisma.homework.create.mockResolvedValue({ id: "hw-3" });

      await service.postHomework({
        schoolId: "school-1",
        teacherStaffId: "staff-1",
        classId: "gl-1",
        subjectId: "subj-1",
        description: "Math worksheet",
        dueDate,
        requiresAcknowledgement: true,
      });

      const callArgs = mockPrisma.homework.create.mock.calls[0][0].data;
      expect(callArgs.requiresAcknowledgement).toBe(true);
    });
  });

  // ─── submitAssignment / acknowledgeHomework (on-time vs late) ─────────────────

  describe("acknowledgeHomework", () => {
    it("upserts acknowledgement for homework that requires acknowledgement", async () => {
      mockPrisma.homework.findUnique.mockResolvedValue({
        id: "hw-1",
        requiresAcknowledgement: true,
      });
      const ack = { homeworkId: "hw-1", studentId: "stu-1", acknowledgedBy: "parent-1" };
      mockPrisma.homeworkAcknowledgement.upsert.mockResolvedValue(ack);

      const result = await service.acknowledgeHomework("hw-1", "stu-1", "parent-1");

      expect(mockPrisma.homeworkAcknowledgement.upsert).toHaveBeenCalledWith({
        where: { homeworkId_studentId: { homeworkId: "hw-1", studentId: "stu-1" } },
        update: expect.objectContaining({ acknowledgedBy: "parent-1" }),
        create: expect.objectContaining({ homeworkId: "hw-1", studentId: "stu-1", acknowledgedBy: "parent-1" }),
      });
      expect(result).toEqual(ack);
    });

    it("returns informational message when acknowledgement not required (late flag not applicable)", async () => {
      mockPrisma.homework.findUnique.mockResolvedValue({
        id: "hw-2",
        requiresAcknowledgement: false,
      });

      const result = await service.acknowledgeHomework("hw-2", "stu-1", "parent-1") as any;

      expect(result.message).toContain("not required");
      expect(mockPrisma.homeworkAcknowledgement.upsert).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when homework does not exist", async () => {
      mockPrisma.homework.findUnique.mockResolvedValue(null);

      await expect(
        service.acknowledgeHomework("hw-missing", "stu-1", "parent-1"),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── getTodaysHomework ────────────────────────────────────────────────────────

  describe("getTodaysHomework", () => {
    it("returns mapped homework list for a valid student", async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        gradeLevelId: "gl-1",
        sectionId: "sec-1",
      });
      const hw = {
        id: "hw-1",
        subject: { name: "Math" },
        description: "Page 45",
        dueDate: new Date(),
        requiresAcknowledgement: false,
        acknowledgements: [],
        attachmentUrl: null,
      };
      mockPrisma.homework.findMany.mockResolvedValue([hw]);

      const result = await service.getTodaysHomework("stu-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "hw-1",
        subjectName: "Math",
        description: "Page 45",
        acknowledged: false,
      });
    });

    it("throws NotFoundError when student not found", async () => {
      mockPrisma.student.findUnique.mockResolvedValue(null);

      await expect(service.getTodaysHomework("stu-missing")).rejects.toThrow(NotFoundError);
    });

    it("marks acknowledged as true when acknowledgement record exists", async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        gradeLevelId: "gl-1",
        sectionId: "sec-1",
      });
      const hw = {
        id: "hw-2",
        subject: { name: "English" },
        description: "Essay",
        dueDate: new Date(),
        requiresAcknowledgement: true,
        acknowledgements: [{ id: "ack-1" }],
        attachmentUrl: null,
      };
      mockPrisma.homework.findMany.mockResolvedValue([hw]);

      const result = await service.getTodaysHomework("stu-1");

      expect(result[0].acknowledged).toBe(true);
    });
  });

  // ─── getHomeworkLoadAnalytics ─────────────────────────────────────────────────

  describe("getHomeworkLoadAnalytics", () => {
    it("correctly identifies overloaded classes (avg > 3 per day)", async () => {
      const from = new Date("2025-01-01");
      const to = new Date("2025-01-01"); // 1-day window → dayRange = 1

      // 5 homework items for same class on same day → avg = 5 > threshold 3
      const homeworkItems = Array.from({ length: 5 }, (_, i) => ({
        id: `hw-${i}`,
        gradeLevelId: "gl-1",
        assignedDate: new Date("2025-01-01"),
        dueDate: new Date("2025-01-02"),
        gradeLevel: { name: "Grade 5" },
        subject: { name: "Math" },
      }));
      mockPrisma.homework.findMany.mockResolvedValue(homeworkItems);

      const result = await service.getHomeworkLoadAnalytics("school-1", from, to);

      expect(result.overloadedClasses).toHaveLength(1);
      expect(result.classAnalytics[0].overloaded).toBe(true);
      expect(result.classAnalytics[0].avgHomeworkPerDay).toBe(5);
    });

    it("does not flag classes within the threshold", async () => {
      const from = new Date("2025-01-01");
      const to = new Date("2025-01-07"); // 7-day window

      // 3 homework items across 7 days → avg = 0.43
      const homeworkItems = Array.from({ length: 3 }, (_, i) => ({
        id: `hw-${i}`,
        gradeLevelId: "gl-2",
        assignedDate: new Date(`2025-01-0${i + 1}`),
        dueDate: new Date(`2025-01-0${i + 2}`),
        gradeLevel: { name: "Grade 3" },
        subject: { name: "Science" },
      }));
      mockPrisma.homework.findMany.mockResolvedValue(homeworkItems);

      const result = await service.getHomeworkLoadAnalytics("school-1", from, to);

      expect(result.overloadedClasses).toHaveLength(0);
      expect(result.classAnalytics[0].overloaded).toBe(false);
    });

    it("returns empty analytics when no homework exists", async () => {
      mockPrisma.homework.findMany.mockResolvedValue([]);

      const result = await service.getHomeworkLoadAnalytics(
        "school-1",
        new Date("2025-01-01"),
        new Date("2025-01-31"),
      );

      expect(result.classAnalytics).toHaveLength(0);
      expect(result.overloadedClasses).toHaveLength(0);
    });
  });
});
