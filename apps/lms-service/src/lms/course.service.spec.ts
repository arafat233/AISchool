import { Test, TestingModule } from "@nestjs/testing";
import { CourseService } from "./course.service";
import { NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  course: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  courseUnit: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  lesson: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  $transaction: jest.fn(),
};

describe("CourseService", () => {
  let service: CourseService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<CourseService>(CourseService);
  });

  describe("createCourse", () => {
    it("should create a course", async () => {
      mockPrisma.course.create.mockResolvedValueOnce({ id: "course-1", title: "Math Grade 5" });
      const result = await service.createCourse("sch-1", {
        title: "Math Grade 5", subjectId: "sub-1", gradeLevelId: "gl-5",
      });
      expect(result.id).toBe("course-1");
    });
  });

  describe("getCourse", () => {
    it("should return course with units and lessons", async () => {
      mockPrisma.course.findUnique.mockResolvedValueOnce({
        id: "course-1", units: [{ id: "unit-1", lessons: [] }],
      });
      const result = await service.getCourse("course-1");
      expect(result.units).toHaveLength(1);
    });

    it("should throw NotFoundError when course not found", async () => {
      mockPrisma.course.findUnique.mockResolvedValueOnce(null);
      await expect(service.getCourse("nonexistent")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("createUnit", () => {
    it("should auto-increment orderIndex based on last unit", async () => {
      mockPrisma.course.findUnique.mockResolvedValueOnce({ id: "course-1" });
      mockPrisma.courseUnit.findFirst.mockResolvedValueOnce({ orderIndex: 3 });
      mockPrisma.courseUnit.create.mockResolvedValueOnce({ id: "unit-4", orderIndex: 4 });
      const result = await service.createUnit("course-1", { title: "Unit 4" });
      expect(result.orderIndex).toBe(4);
    });

    it("should start at orderIndex 1 for first unit", async () => {
      mockPrisma.course.findUnique.mockResolvedValueOnce({ id: "course-1" });
      mockPrisma.courseUnit.findFirst.mockResolvedValueOnce(null); // no existing units
      mockPrisma.courseUnit.create.mockResolvedValueOnce({ id: "unit-1", orderIndex: 1 });
      const result = await service.createUnit("course-1", { title: "Unit 1" });
      expect(result.orderIndex).toBe(1);
    });

    it("should throw NotFoundError when course does not exist", async () => {
      mockPrisma.course.findUnique.mockResolvedValueOnce(null);
      await expect(service.createUnit("nonexistent", { title: "Unit" })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("createLesson", () => {
    it("should auto-increment orderIndex", async () => {
      mockPrisma.courseUnit.findUnique = jest.fn().mockResolvedValueOnce({ id: "unit-1" });
      mockPrisma.lesson.findFirst.mockResolvedValueOnce({ orderIndex: 2 });
      mockPrisma.lesson.create.mockResolvedValueOnce({ id: "lesson-3", orderIndex: 3 });
      const result = await service.createLesson("unit-1", {
        title: "Introduction to Fractions", type: "VIDEO", contentUrl: "https://cdn/video.mp4",
      });
      expect(result.orderIndex).toBe(3);
    });
  });

  describe("getCourses", () => {
    it("should filter by subjectId when provided", async () => {
      mockPrisma.course.findMany.mockResolvedValueOnce([]);
      await service.getCourses("sch-1", { subjectId: "sub-1" });
      expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ subjectId: "sub-1" }) })
      );
    });
  });
});
