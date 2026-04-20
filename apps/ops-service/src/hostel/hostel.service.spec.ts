import { Test, TestingModule } from "@nestjs/testing";
import { HostelService } from "./hostel.service";

const mockPrisma = {
  $executeRaw: jest.fn().mockResolvedValue(1),
  $queryRaw: jest.fn().mockResolvedValue([]),
};

describe("HostelService", () => {
  let service: HostelService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [HostelService, { provide: require("../prisma/prisma.service").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<HostelService>(HostelService);
  });

  describe("allotBed", () => {
    it("should throw when bed is already occupied", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: "allot-existing" }]);
      await expect(service.allotBed({
        studentId: "stu-1", roomId: "room-1", bedNo: "A1",
        academicYearId: "ay-1", checkInDate: new Date(),
        mealPlan: "VEG", allergens: [],
      })).rejects.toThrow("Bed already occupied");
    });

    it("should insert allotment when bed is available", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]); // no existing allotment
      await service.allotBed({
        studentId: "stu-1", roomId: "room-1", bedNo: "A1",
        academicYearId: "ay-1", checkInDate: new Date(),
        mealPlan: "VEG", allergens: [],
      });
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe("applyLeave", () => {
    it("should return a leaveId", async () => {
      const result = await service.applyLeave("sch-1", {
        studentId: "stu-1", type: "WEEKEND",
        fromDate: new Date("2026-04-25"), toDate: new Date("2026-04-27"),
        reason: "Home visit", parentContactNo: "9876543210",
      });
      expect(result.leaveId).toMatch(/^LEAVE-/);
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe("approveLeave", () => {
    it("should update warden approval", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ warden_approved: true, parent_approved: false }]);
      await service.approveLeave("leave-1", "warden-1", "WARDEN");
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it("should issue gate pass when both WARDEN and PARENT approved", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ warden_approved: true, parent_approved: true }]);
      await service.approveLeave("leave-1", "parent-1", "PARENT");
      // $executeRaw called at least twice: once for parent approval, once for gate pass
      expect(mockPrisma.$executeRaw.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("recordNightRollCall", () => {
    it("should insert/update one record per student", async () => {
      const records = [
        { studentId: "stu-1", status: "IN_HOSTEL" as const },
        { studentId: "stu-2", status: "WEEKEND_LEAVE" as const },
      ];
      await service.recordNightRollCall("sch-1", new Date(), records);
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe("allotStaffQuarters", () => {
    it("should throw when unit is already occupied", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: "sq-1" }]);
      await expect(service.allotStaffQuarters("sch-1", "staff-1", "unit-A", new Date()))
        .rejects.toThrow("Unit already occupied");
    });

    it("should allot when unit is vacant", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      await service.allotStaffQuarters("sch-1", "staff-1", "unit-A", new Date());
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });
});
