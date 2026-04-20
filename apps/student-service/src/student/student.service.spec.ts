import { Test, TestingModule } from "@nestjs/testing";
import { StudentService } from "./student.service";
import { ConflictError, NotFoundError } from "@school-erp/errors";

jest.mock("@school-erp/utils", () => ({
  parsePagination: jest.fn().mockReturnValue({ skip: 0, take: 20, page: 1, limit: 20 }),
  buildPaginatedResult: jest.fn((data, total, page, limit) => ({ data, total, page, limit })),
  generateAdmissionNumber: jest.fn().mockReturnValue("ADM-2026-001"),
}));

const mockPrisma = {
  student: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
};

const mockStudent = {
  id: "stu-1",
  schoolId: "sch-1",
  admissionNo: "ADM-001",
  firstName: "Ravi",
  lastName: "Kumar",
  isActive: true,
  section: { gradeLevel: { name: "Grade 5" } },
};

describe("StudentService", () => {
  let service: StudentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<StudentService>(StudentService);
  });

  describe("create", () => {
    it("should create a student when admission number is unique", async () => {
      mockPrisma.student.findFirst.mockResolvedValueOnce(null);
      mockPrisma.student.create.mockResolvedValueOnce(mockStudent);
      const result = await service.create("sch-1", "tenant-1", {
        admissionNo: "ADM-001", firstName: "Ravi", lastName: "Kumar",
        dateOfBirth: "2010-01-01", gender: "MALE", sectionId: "sec-1",
        academicYearId: "ay-1", admissionDate: "2026-04-01",
      } as any);
      expect(result.id).toBe("stu-1");
      expect(mockPrisma.student.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ admissionNo: "ADM-001" }) })
      );
    });

    it("should throw ConflictError if admission number already exists", async () => {
      mockPrisma.student.findFirst.mockResolvedValueOnce(mockStudent);
      await expect(service.create("sch-1", "tenant-1", { admissionNo: "ADM-001" } as any))
        .rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("findAll", () => {
    it("should return paginated students", async () => {
      mockPrisma.student.findMany.mockResolvedValueOnce([mockStudent]);
      mockPrisma.student.count.mockResolvedValueOnce(1);
      const result = await service.findAll("sch-1", {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should filter by sectionId when provided", async () => {
      mockPrisma.student.findMany.mockResolvedValueOnce([]);
      mockPrisma.student.count.mockResolvedValueOnce(0);
      await service.findAll("sch-1", { sectionId: "sec-1" });
      expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ sectionId: "sec-1" }) })
      );
    });
  });

  describe("findOne", () => {
    it("should return the student when found", async () => {
      mockPrisma.student.findFirst.mockResolvedValueOnce(mockStudent);
      const result = await service.findOne("stu-1", "sch-1");
      expect(result.id).toBe("stu-1");
    });

    it("should throw NotFoundError when student not found", async () => {
      mockPrisma.student.findFirst.mockResolvedValueOnce(null);
      await expect(service.findOne("nonexistent", "sch-1")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("update", () => {
    it("should update and return the student", async () => {
      mockPrisma.student.findFirst.mockResolvedValueOnce(mockStudent);
      mockPrisma.student.update.mockResolvedValueOnce({ ...mockStudent, firstName: "Rahul" });
      const result = await service.update("stu-1", "sch-1", { firstName: "Rahul" } as any);
      expect(result.firstName).toBe("Rahul");
    });
  });

  describe("withdraw", () => {
    it("should set isActive to false", async () => {
      mockPrisma.student.findFirst.mockResolvedValueOnce(mockStudent);
      mockPrisma.student.update.mockResolvedValueOnce({ ...mockStudent, isActive: false });
      const result = await service.update("stu-1", "sch-1", { isActive: false } as any);
      expect(result.isActive).toBe(false);
    });
  });
});
