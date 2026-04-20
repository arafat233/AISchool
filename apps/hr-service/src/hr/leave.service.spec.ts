import { Test, TestingModule } from "@nestjs/testing";
import { LeaveService } from "./leave.service";
import { NotFoundError } from "@school-erp/errors";

const mockPrisma = {
  leavePolicy: { create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  leaveBalance: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  leaveApplication: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  staff: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

describe("LeaveService", () => {
  let service: LeaveService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeaveService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<LeaveService>(LeaveService);
  });

  describe("applyLeave", () => {
    it("should create leave application when balance is sufficient", async () => {
      mockPrisma.leaveBalance.findUnique.mockResolvedValueOnce({
        remainingDays: 10, leaveType: "CASUAL", staffId: "staff-1",
      });
      mockPrisma.leaveApplication.create.mockResolvedValueOnce({ id: "leave-1", status: "PENDING" });

      const result = await service.applyLeave({
        staffId: "staff-1", leaveType: "CASUAL",
        fromDate: new Date("2026-06-01"), toDate: new Date("2026-06-02"),
        reason: "Personal work", academicYearId: "ay-1",
      });
      expect(result.status).toBe("PENDING");
    });

    it("should throw when balance is insufficient", async () => {
      mockPrisma.leaveBalance.findUnique.mockResolvedValueOnce({
        remainingDays: 1, leaveType: "CASUAL", staffId: "staff-1",
      });
      await expect(service.applyLeave({
        staffId: "staff-1", leaveType: "CASUAL",
        fromDate: new Date("2026-06-01"), toDate: new Date("2026-06-05"),
        reason: "Trip", academicYearId: "ay-1",
      })).rejects.toThrow();
    });
  });

  describe("approveLeave", () => {
    it("should update status and deduct from balance", async () => {
      mockPrisma.leaveApplication.findUnique.mockResolvedValueOnce({
        id: "leave-1", status: "PENDING", staffId: "staff-1",
        leaveType: "CASUAL", academicYearId: "ay-1",
        fromDate: new Date("2026-06-01"), toDate: new Date("2026-06-02"),
      });
      mockPrisma.leaveApplication.update.mockResolvedValueOnce({ id: "leave-1", status: "APPROVED" });
      mockPrisma.leaveBalance.update.mockResolvedValueOnce({});

      const result = await service.approveLeave("leave-1", "principal-1");
      expect(result.status).toBe("APPROVED");
    });

    it("should throw when leave not found", async () => {
      mockPrisma.leaveApplication.findUnique.mockResolvedValueOnce(null);
      await expect(service.approveLeave("nonexistent", "principal-1")).rejects.toThrow();
    });
  });

  describe("rejectLeave", () => {
    it("should require rejection reason", async () => {
      mockPrisma.leaveApplication.findUnique.mockResolvedValueOnce({ id: "leave-1", status: "PENDING" });
      await expect(service.rejectLeave("leave-1", "principal-1", "")).rejects.toThrow();
    });

    it("should update status to REJECTED with reason", async () => {
      mockPrisma.leaveApplication.findUnique.mockResolvedValueOnce({ id: "leave-1", status: "PENDING" });
      mockPrisma.leaveApplication.update.mockResolvedValueOnce({ id: "leave-1", status: "REJECTED" });
      const result = await service.rejectLeave("leave-1", "principal-1", "Not justified");
      expect(result.status).toBe("REJECTED");
    });
  });

  describe("getLeaveBalances", () => {
    it("should return balances for staff for academic year", async () => {
      mockPrisma.leaveBalance.findMany.mockResolvedValueOnce([
        { leaveType: "CASUAL", totalDays: 12, usedDays: 3, remainingDays: 9 },
      ]);
      const result = await service.getLeaveBalances("staff-1", "ay-1");
      expect(result).toHaveLength(1);
      expect(result[0].remainingDays).toBe(9);
    });
  });

  describe("initLeaveBalances", () => {
    it("should throw NotFoundError when staff not found", async () => {
      mockPrisma.staff.findUnique.mockResolvedValueOnce(null);
      await expect(service.initLeaveBalances("nonexistent", "ay-1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should upsert balances for each leave policy", async () => {
      mockPrisma.staff.findUnique.mockResolvedValueOnce({ schoolId: "sch-1" });
      mockPrisma.leavePolicy.findMany.mockResolvedValueOnce([
        { leaveType: "CASUAL", annualDays: 12 },
        { leaveType: "SICK", annualDays: 7 },
      ]);
      mockPrisma.$transaction.mockResolvedValueOnce([{}, {}]);
      await service.initLeaveBalances("staff-1", "ay-1");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
