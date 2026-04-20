import { Test, TestingModule } from "@nestjs/testing";
import { ExitService } from "./exit.service";

const mockPrisma = {
  staffExit: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  handoverItem: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  staff: { update: jest.fn() },
};

describe("ExitService", () => {
  let service: ExitService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExitService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<ExitService>(ExitService);
  });

  describe("submitResignation", () => {
    it("should create exit record with RESIGNATION_SUBMITTED status", async () => {
      mockPrisma.staffExit.create.mockResolvedValueOnce({
        id: "exit-1", status: "RESIGNATION_SUBMITTED", exitType: "RESIGNATION",
      });
      const result = await service.submitResignation({
        staffId: "staff-1", reason: "Career change",
        lastWorkingDate: new Date("2026-05-31"),
      });
      expect(result.status).toBe("RESIGNATION_SUBMITTED");
      expect(result.exitType).toBe("RESIGNATION");
    });

    it("should default notice period to 30 days", async () => {
      mockPrisma.staffExit.create.mockResolvedValueOnce({ id: "exit-1" });
      await service.submitResignation({
        staffId: "staff-1", reason: "Personal", lastWorkingDate: new Date(),
      });
      const createCall = mockPrisma.staffExit.create.mock.calls[0][0];
      expect(createCall.data.noticePeriodDays).toBe(30);
    });
  });

  describe("addHandoverItem", () => {
    it("should create handover item with isDone=false", async () => {
      mockPrisma.handoverItem.create.mockResolvedValueOnce({ id: "item-1", isDone: false });
      const result = await service.addHandoverItem("exit-1", { task: "Submit grades" });
      expect(result.isDone).toBe(false);
    });
  });

  describe("markHandoverItemDone", () => {
    it("should set isDone=true and completedAt", async () => {
      mockPrisma.handoverItem.update.mockResolvedValueOnce({ id: "item-1", isDone: true });
      await service.markHandoverItemDone("item-1");
      const updateCall = mockPrisma.handoverItem.update.mock.calls[0][0];
      expect(updateCall.data.isDone).toBe(true);
      expect(updateCall.data.completedAt).toBeInstanceOf(Date);
    });
  });

  describe("getHandoverChecklist", () => {
    it("should return handover items for exit", async () => {
      mockPrisma.handoverItem.findMany.mockResolvedValueOnce([
        { id: "item-1", task: "Submit grades", isDone: false },
        { id: "item-2", task: "Return laptop", isDone: true },
      ]);
      const result = await service.getHandoverChecklist("exit-1");
      expect(result).toHaveLength(2);
    });
  });

  describe("updateExitStatus", () => {
    it("should update status field", async () => {
      mockPrisma.staffExit.update.mockResolvedValueOnce({ id: "exit-1", status: "APPROVED" });
      const result = await service.updateExitStatus("exit-1", "APPROVED");
      expect(result.status).toBe("APPROVED");
    });
  });
});
