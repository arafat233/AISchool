import { Test, TestingModule } from "@nestjs/testing";
import { MdmService } from "./mdm.service";

jest.mock("axios");

const mockPrisma = {
  $executeRaw: jest.fn().mockResolvedValue(1),
  $queryRaw: jest.fn().mockResolvedValue([]),
};

const mockDevice = {
  id: "dev-1", serial_number: "SN001", model: "iPad", os: "IOS", os_version: "17.0",
  assigned_student_id: "stu-1", school_id: "sch-1", status: "ACTIVE",
  mdm_enrolled: false, last_seen: null,
};

describe("MdmService", () => {
  let service: MdmService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [MdmService, { provide: require("../prisma/prisma.service").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<MdmService>(MdmService);
  });

  describe("registerDevice", () => {
    it("should insert device and map to Device interface", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([mockDevice]);
      const result = await service.registerDevice("sch-1", {
        serialNumber: "SN001", model: "iPad", os: "IOS", osVersion: "17.0",
        assignedStudentId: "stu-1", status: "ACTIVE",
      });
      expect(result.id).toBe("dev-1");
      expect(result.serialNumber).toBe("SN001");
      expect(result.mdmEnrolled).toBe(false);
    });
  });

  describe("assignDevice", () => {
    it("should call $executeRaw to update assigned_student_id", async () => {
      await service.assignDevice("dev-1", "stu-2");
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe("remoteLock", () => {
    it("should skip MDM call when provider is NONE", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ provider: "NONE" }]);
      await service.remoteLock("dev-1", "sch-1", "Lost");
      // $executeRaw called once for action log, no JAMF/Intune calls
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("should skip when no MDM settings configured", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]); // no settings
      await service.remoteLock("dev-1", "sch-1", "Lost");
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe("getAppPolicy", () => {
    it("should return null when no policy configured", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      const result = await service.getAppPolicy("sch-1");
      expect(result).toBeNull();
    });

    it("should return policy when configured", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{
        whitelist: ["com.google.classroom"], blacklist: ["com.tiktok"], required_apps: [],
      }]);
      const result = await service.getAppPolicy("sch-1");
      expect(result?.whitelist).toContain("com.google.classroom");
    });
  });
});
