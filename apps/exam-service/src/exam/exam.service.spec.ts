import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { ExamService } from "./exam.service";
import { GradingService } from "./grading.service";
import { ReportCardService } from "./report-card.service";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";

const mockPrisma = {
  exam: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  examScheduleEntry: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  studentMarks: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  examResult: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    updateMany: jest.fn(),
  },
  gradingConfig: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
  },
  graceMarksPolicy: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
  },
  graceMarksLog: {
    create: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockGrading = {
  getGrade: jest.fn(),
  getGradePoints: jest.fn(),
  calculateCGPA: jest.fn(),
};

const mockReportCard = {
  generateHallTicketPDF: jest.fn(),
  generateReportCardPDF: jest.fn(),
};

describe("ExamService", () => {
  let service: ExamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GradingService, useValue: mockGrading },
        { provide: ReportCardService, useValue: mockReportCard },
      ],
    }).compile();

    service = module.get<ExamService>(ExamService);
    jest.clearAllMocks();
  });

  // ── createExam ────────────────────────────────────────────────────────────────

  describe("createExam", () => {
    it("creates an exam with DRAFT status", async () => {
      const created = { id: "exam-1", title: "Mid Term", status: "DRAFT" };
      mockPrisma.exam.create.mockResolvedValue(created);

      const result = await service.createExam("school-1", {
        title: "Mid Term",
        type: "MID_TERM",
        academicYearId: "ay-1",
        term: "Term 1",
      });

      expect(mockPrisma.exam.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: "DRAFT", title: "Mid Term", schoolId: "school-1" }),
      });
      expect(result.status).toBe("DRAFT");
    });

    it("passes optional description when provided", async () => {
      mockPrisma.exam.create.mockResolvedValue({ id: "exam-2", status: "DRAFT" });

      await service.createExam("school-1", {
        title: "Final",
        type: "FINAL",
        academicYearId: "ay-1",
        term: "Term 3",
        description: "End-of-year exam",
      });

      expect(mockPrisma.exam.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ description: "End-of-year exam" }),
      });
    });
  });

  // ── scheduleExam (updateExamStatus DRAFT→SCHEDULED) ───────────────────────────

  describe("scheduleExam (updateExamStatus)", () => {
    it("transitions from DRAFT to SCHEDULED", async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({ id: "exam-1", status: "DRAFT" });
      mockPrisma.exam.update.mockResolvedValue({ id: "exam-1", status: "SCHEDULED" });

      const result = await service.updateExamStatus("exam-1", "SCHEDULED");

      expect(mockPrisma.exam.update).toHaveBeenCalledWith({
        where: { id: "exam-1" },
        data: { status: "SCHEDULED" },
      });
      expect(result.status).toBe("SCHEDULED");
    });

    it("throws NotFoundError when exam does not exist", async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(null);

      await expect(service.updateExamStatus("bad-id", "SCHEDULED")).rejects.toThrow(NotFoundError);
    });

    it("throws BadRequestException for invalid transition", async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({ id: "exam-1", status: "PUBLISHED" });

      await expect(service.updateExamStatus("exam-1", "DRAFT")).rejects.toThrow(BadRequestException);
    });
  });

  // ── getExamById ───────────────────────────────────────────────────────────────

  describe("getExam", () => {
    it("returns exam when found", async () => {
      const exam = { id: "exam-1", title: "Mid Term", scheduleEntries: [] };
      mockPrisma.exam.findUnique.mockResolvedValue(exam);

      const result = await service.getExam("exam-1");

      expect(result).toEqual(exam);
      expect(mockPrisma.exam.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "exam-1" } }));
    });

    it("throws NotFoundError when exam is not found", async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(null);

      await expect(service.getExam("missing")).rejects.toThrow(NotFoundError);
    });
  });

  // ── deleteExam ────────────────────────────────────────────────────────────────

  describe("deleteExam", () => {
    it("deletes a DRAFT exam", async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({ id: "exam-1", status: "DRAFT" });
      mockPrisma.exam.delete.mockResolvedValue({ id: "exam-1" });

      await service.deleteExam("exam-1");

      expect(mockPrisma.exam.delete).toHaveBeenCalledWith({ where: { id: "exam-1" } });
    });

    it("throws ConflictError/BadRequestException for non-DRAFT exam", async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({ id: "exam-1", status: "SCHEDULED" });

      await expect(service.deleteExam("exam-1")).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundError when exam not found", async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(null);

      await expect(service.deleteExam("bad")).rejects.toThrow(NotFoundError);
    });
  });

  // ── listExams (getExams with filters) ────────────────────────────────────────

  describe("getExams", () => {
    it("returns all exams for a school", async () => {
      mockPrisma.exam.findMany.mockResolvedValue([{ id: "exam-1" }]);

      const result = await service.getExams("school-1");

      expect(mockPrisma.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ schoolId: "school-1" }) }),
      );
      expect(result).toHaveLength(1);
    });

    it("passes type filter when provided", async () => {
      mockPrisma.exam.findMany.mockResolvedValue([]);

      await service.getExams("school-1", { type: "FINAL" });

      expect(mockPrisma.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ type: "FINAL" }) }),
      );
    });

    it("passes status filter when provided", async () => {
      mockPrisma.exam.findMany.mockResolvedValue([]);

      await service.getExams("school-1", { status: "PUBLISHED" });

      expect(mockPrisma.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "PUBLISHED" }) }),
      );
    });
  });

  // ── bulkEnterMarks (submitMarks) ──────────────────────────────────────────────

  describe("submitMarks", () => {
    const scheduleEntry = { id: "entry-1", examId: "exam-1", maxMarksTheory: 100, maxMarksPractical: 0, maxMarksInternal: 0 };

    it("creates/updates result records via transaction", async () => {
      mockPrisma.examScheduleEntry.findUnique.mockResolvedValue(scheduleEntry);
      mockPrisma.exam.findUnique.mockResolvedValue({ id: "exam-1", status: "MARKS_ENTRY" });
      mockPrisma.studentMarks.upsert.mockResolvedValue({ id: "mark-1" });
      mockPrisma.$transaction.mockResolvedValue([{ id: "mark-1" }]);

      const marks = [{ studentId: "s-1", theory: 80 }];
      const result = await service.submitMarks("entry-1", marks);

      expect(mockPrisma.studentMarks.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scheduleEntryId_studentId: { scheduleEntryId: "entry-1", studentId: "s-1" } },
        }),
      );
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("throws BadRequestException when exam is not in MARKS_ENTRY status", async () => {
      mockPrisma.examScheduleEntry.findUnique.mockResolvedValue(scheduleEntry);
      mockPrisma.exam.findUnique.mockResolvedValue({ id: "exam-1", status: "SCHEDULED" });

      await expect(service.submitMarks("entry-1", [{ studentId: "s-1", theory: 50 }])).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundError when schedule entry not found", async () => {
      mockPrisma.examScheduleEntry.findUnique.mockResolvedValue(null);

      await expect(service.submitMarks("bad-entry", [])).rejects.toThrow(NotFoundError);
    });
  });

  // ── publishResults ────────────────────────────────────────────────────────────

  describe("publishResults", () => {
    it("publishes results when marks are complete", async () => {
      // validateMarksCompleteness → ready: true
      mockPrisma.examScheduleEntry.findMany.mockResolvedValue([
        { sectionId: "sec-1", subjectId: "sub-1", marks: [{}], section: { students: [{}] } },
      ]);
      // getExam calls
      mockPrisma.exam.findUnique
        .mockResolvedValueOnce({ id: "exam-1", status: "MARKS_ENTRY", scheduleEntries: [], schoolId: "school-1" }) // calculateResults → getExam
        .mockResolvedValueOnce({ id: "exam-1", status: "MARKS_ENTRY" }) // updateExamStatus findUnique
        .mockResolvedValueOnce({ id: "exam-1", title: "Final", scheduleEntries: [] }); // final getExam
      mockPrisma.gradingConfig.findFirst.mockResolvedValue(null);
      mockPrisma.exam.update.mockResolvedValue({ id: "exam-1", status: "PUBLISHED" });
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.examResult.findMany.mockResolvedValue([{ id: "r-1" }, { id: "r-2" }]);
      mockPrisma.examResult.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.publishResults("exam-1");

      expect(result).toMatchObject({ message: "Results published successfully", totalStudents: 2 });
    });

    it("throws BadRequestException when marks are incomplete", async () => {
      mockPrisma.examScheduleEntry.findMany.mockResolvedValue([
        { sectionId: "sec-1", subjectId: "sub-1", marks: [], section: { students: [{}] } },
      ]);

      await expect(service.publishResults("exam-1")).rejects.toThrow(BadRequestException);
    });
  });
});
