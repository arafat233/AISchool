import { Test, TestingModule } from "@nestjs/testing";
import { AcademicService } from "./academic.service";
import { PrismaService } from "@school-erp/database";
import { ConflictError } from "@school-erp/errors";

const mockPrisma = {
  academicYear: {
    updateMany: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  gradeLevel: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  section: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  subject: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  classSubject: {
    upsert: jest.fn(),
  },
  timetableSlot: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
};

describe("AcademicService", () => {
  let service: AcademicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AcademicService>(AcademicService);
  });

  beforeEach(() => jest.clearAllMocks());

  // ─── createClass (createGradeLevel) ──────────────────────────────────────────

  describe("createGradeLevel", () => {
    it("creates a grade level when name does not exist", async () => {
      mockPrisma.gradeLevel.findFirst.mockResolvedValue(null);
      const created = { id: "gl-1", schoolId: "school-1", name: "Grade 1", numericLevel: 1 };
      mockPrisma.gradeLevel.create.mockResolvedValue(created);

      const result = await service.createGradeLevel("school-1", { name: "Grade 1", numericLevel: 1 });

      expect(mockPrisma.gradeLevel.findFirst).toHaveBeenCalledWith({
        where: { schoolId: "school-1", name: "Grade 1" },
      });
      expect(mockPrisma.gradeLevel.create).toHaveBeenCalledWith({
        data: { schoolId: "school-1", name: "Grade 1", numericLevel: 1 },
      });
      expect(result).toEqual(created);
    });

    it("throws ConflictError when grade name already exists", async () => {
      mockPrisma.gradeLevel.findFirst.mockResolvedValue({ id: "gl-existing" });

      await expect(
        service.createGradeLevel("school-1", { name: "Grade 1", numericLevel: 1 }),
      ).rejects.toThrow(ConflictError);

      expect(mockPrisma.gradeLevel.create).not.toHaveBeenCalled();
    });
  });

  // ─── createSubject ────────────────────────────────────────────────────────────

  describe("createSubject", () => {
    it("creates subject when code does not exist", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(null);
      const created = { id: "subj-1", code: "MATH01", name: "Mathematics", isElective: false };
      mockPrisma.subject.create.mockResolvedValue(created);

      const result = await service.createSubject("school-1", {
        name: "Mathematics",
        code: "MATH01",
        isElective: false,
      });

      expect(mockPrisma.subject.findFirst).toHaveBeenCalledWith({
        where: { schoolId: "school-1", code: "MATH01" },
      });
      expect(result).toEqual(created);
    });

    it("throws ConflictError when subject code already exists (duplicate code blocked)", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue({ id: "subj-existing", code: "MATH01" });

      await expect(
        service.createSubject("school-1", { name: "Mathematics", code: "MATH01" }),
      ).rejects.toThrow(ConflictError);

      expect(mockPrisma.subject.create).not.toHaveBeenCalled();
    });

    it("creates elective subject with isElective flag", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(null);
      const created = { id: "subj-2", code: "ART01", name: "Art", isElective: true };
      mockPrisma.subject.create.mockResolvedValue(created);

      const result = await service.createSubject("school-1", {
        name: "Art",
        code: "ART01",
        isElective: true,
      });

      expect(mockPrisma.subject.create).toHaveBeenCalledWith({
        data: { schoolId: "school-1", name: "Art", code: "ART01", isElective: true },
      });
      expect(result.isElective).toBe(true);
    });
  });

  // ─── createTimetableSlot (updateTimetableSlot / conflict detection) ───────────

  describe("createTimetableSlot", () => {
    const slotData = {
      sectionId: "sec-1",
      subjectId: "subj-1",
      staffId: "staff-1",
      dayOfWeek: 1,
      periodNo: 2,
      startTime: "09:00",
      endTime: "09:45",
      academicYearId: "ay-1",
    };

    it("creates a timetable slot when no conflicts exist", async () => {
      mockPrisma.timetableSlot.findFirst.mockResolvedValue(null);
      const created = { id: "slot-1", ...slotData };
      mockPrisma.timetableSlot.create.mockResolvedValue(created);

      const result = await service.createTimetableSlot(slotData);

      expect(mockPrisma.timetableSlot.findFirst).toHaveBeenCalledTimes(2);
      expect(mockPrisma.timetableSlot.create).toHaveBeenCalledWith({
        data: { ...slotData, startTime: slotData.startTime, endTime: slotData.endTime },
      });
      expect(result).toEqual(created);
    });

    it("throws ConflictError when section+day+period is already assigned (slot occupied)", async () => {
      // First findFirst (section conflict) returns a conflict
      mockPrisma.timetableSlot.findFirst.mockResolvedValueOnce({ id: "slot-conflict" });

      await expect(service.createTimetableSlot(slotData)).rejects.toThrow(ConflictError);
      expect(mockPrisma.timetableSlot.create).not.toHaveBeenCalled();
    });

    it("throws ConflictError when teacher has another class at the same time", async () => {
      // First findFirst (section) returns null, second (teacher) returns conflict
      mockPrisma.timetableSlot.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "teacher-conflict" });

      await expect(service.createTimetableSlot(slotData)).rejects.toThrow(ConflictError);
      expect(mockPrisma.timetableSlot.create).not.toHaveBeenCalled();
    });
  });

  // ─── getClassTimetable ────────────────────────────────────────────────────────

  describe("getTimetable", () => {
    it("returns timetable slots ordered by day and period", async () => {
      const slots = [
        { id: "s1", dayOfWeek: 1, periodNo: 1 },
        { id: "s2", dayOfWeek: 1, periodNo: 2 },
      ];
      mockPrisma.timetableSlot.findMany.mockResolvedValue(slots);

      const result = await service.getTimetable("sec-1", "ay-1");

      expect(mockPrisma.timetableSlot.findMany).toHaveBeenCalledWith({
        where: { sectionId: "sec-1", academicYearId: "ay-1" },
        include: { subject: true, staff: true },
        orderBy: [{ dayOfWeek: "asc" }, { periodNo: "asc" }],
      });
      expect(result).toEqual(slots);
    });

    it("returns empty array when no slots exist", async () => {
      mockPrisma.timetableSlot.findMany.mockResolvedValue([]);

      const result = await service.getTimetable("sec-none", "ay-1");

      expect(result).toEqual([]);
    });
  });

  // ─── mapLessonToOutcome / getCompetencyProgress (via assignSubjectToClass) ────

  describe("assignSubjectToClass", () => {
    it("upserts subject-to-class mapping", async () => {
      const upserted = { gradeLevelId: "gl-1", subjectId: "subj-1", weeklyPeriods: 5, isCompulsory: true };
      mockPrisma.classSubject.upsert.mockResolvedValue(upserted);

      const result = await service.assignSubjectToClass({
        gradeLevelId: "gl-1",
        subjectId: "subj-1",
        weeklyPeriods: 5,
        isCompulsory: true,
      });

      expect(mockPrisma.classSubject.upsert).toHaveBeenCalledWith({
        where: { gradeLevelId_subjectId: { gradeLevelId: "gl-1", subjectId: "subj-1" } },
        update: { weeklyPeriods: 5, isCompulsory: true },
        create: { gradeLevelId: "gl-1", subjectId: "subj-1", weeklyPeriods: 5, isCompulsory: true },
      });
      expect(result).toEqual(upserted);
    });
  });

  // ─── createAcademicYear ───────────────────────────────────────────────────────

  describe("createAcademicYear", () => {
    it("creates academic year and unsets previous current year when isCurrent is true", async () => {
      mockPrisma.academicYear.updateMany.mockResolvedValue({ count: 1 });
      const created = { id: "ay-1", name: "2025-26", isCurrent: true };
      mockPrisma.academicYear.create.mockResolvedValue(created);

      const result = await service.createAcademicYear("school-1", {
        name: "2025-26",
        startDate: "2025-04-01",
        endDate: "2026-03-31",
        isCurrent: true,
      });

      expect(mockPrisma.academicYear.updateMany).toHaveBeenCalledWith({
        where: { schoolId: "school-1", isCurrent: true },
        data: { isCurrent: false },
      });
      expect(result).toEqual(created);
    });

    it("does not call updateMany when isCurrent is false", async () => {
      const created = { id: "ay-2", name: "2024-25", isCurrent: false };
      mockPrisma.academicYear.create.mockResolvedValue(created);

      await service.createAcademicYear("school-1", {
        name: "2024-25",
        startDate: "2024-04-01",
        endDate: "2025-03-31",
        isCurrent: false,
      });

      expect(mockPrisma.academicYear.updateMany).not.toHaveBeenCalled();
    });
  });
});
