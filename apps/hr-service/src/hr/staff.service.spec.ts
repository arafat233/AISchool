import { Test, TestingModule } from "@nestjs/testing";
import { StaffService } from "./staff.service";
import { NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  staff: {
    create: jest.fn(), update: jest.fn(), findUnique: jest.fn(),
    findMany: jest.fn(), count: jest.fn(),
  },
  staffDocument: { create: jest.fn(), findMany: jest.fn() },
};

const mockStaff = {
  id: "staff-1", schoolId: "sch-1", employeeCode: "EMP-001",
  bankAccountNo: "NzMwMDAwMDAwMQ==", // base64 of "7300000001"
  panNo: "QUJDREU=", // base64 of "ABCDE"
  aadharNo: null,
  user: { profile: { firstName: "Ravi" } },
  designation: { name: "Teacher" },
  department: { name: "Science" },
  teacherSubjects: [],
};

describe("StaffService", () => {
  let service: StaffService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [StaffService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<StaffService>(StaffService);
  });

  describe("createStaff", () => {
    it("should create staff with encrypted sensitive fields", async () => {
      mockPrisma.staff.create.mockResolvedValueOnce(mockStaff);
      const result = await service.createStaff("sch-1", {
        userId: "user-1", employeeCode: "EMP-001",
        designationId: "des-1", joinDate: new Date(),
        bankAccountNo: "7300000001", panNo: "ABCDE12345F",
      });
      expect(result).toBeDefined();
      // verify encryption was applied
      const createCall = mockPrisma.staff.create.mock.calls[0][0];
      expect(createCall.data.bankAccountNo).not.toBe("7300000001");
      expect(createCall.data.bankAccountNo).toBe(Buffer.from("7300000001").toString("base64"));
    });

    it("should store null for missing optional sensitive fields", async () => {
      mockPrisma.staff.create.mockResolvedValueOnce(mockStaff);
      await service.createStaff("sch-1", {
        userId: "user-1", employeeCode: "EMP-001",
        designationId: "des-1", joinDate: new Date(),
      });
      const createCall = mockPrisma.staff.create.mock.calls[0][0];
      expect(createCall.data.bankAccountNo).toBeNull();
    });
  });

  describe("getStaff", () => {
    it("should return staff with decrypted sensitive fields", async () => {
      mockPrisma.staff.findUnique.mockResolvedValueOnce(mockStaff);
      const result = await service.getStaff("staff-1");
      expect(result.bankAccountNo).toBe("7300000001");
      expect(result.panNo).toBe("ABCDE");
    });

    it("should throw NotFoundError when staff not found", async () => {
      mockPrisma.staff.findUnique.mockResolvedValueOnce(null);
      await expect(service.getStaff("nonexistent")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("updateStaff", () => {
    it("should encrypt sensitive fields on update", async () => {
      mockPrisma.staff.update.mockResolvedValueOnce(mockStaff);
      await service.updateStaff("staff-1", { bankAccountNo: "9876543210" });
      const updateCall = mockPrisma.staff.update.mock.calls[0][0];
      expect(updateCall.data.bankAccountNo).toBe(Buffer.from("9876543210").toString("base64"));
    });

    it("should pass non-sensitive fields through unchanged", async () => {
      mockPrisma.staff.update.mockResolvedValueOnce(mockStaff);
      await service.updateStaff("staff-1", { bloodGroup: "O+" });
      const updateCall = mockPrisma.staff.update.mock.calls[0][0];
      expect(updateCall.data.bloodGroup).toBe("O+");
    });
  });
});
