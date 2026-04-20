import { Test, TestingModule } from "@nestjs/testing";
import { ExpenseService } from "./expense.service";
import { NotFoundError, ConflictError } from "@school-erp/errors";

const mockPrisma = {
  budget: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  budgetLineItem: { create: jest.fn(), aggregate: jest.fn() },
  purchaseOrder: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  expense: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
  expenseCategory: { findFirst: jest.fn() },
};

describe("ExpenseService", () => {
  let service: ExpenseService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpenseService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<ExpenseService>(ExpenseService);
  });

  describe("createBudget", () => {
    it("should create budget with incremented version", async () => {
      mockPrisma.budget.findFirst.mockResolvedValueOnce({ version: 2 });
      mockPrisma.budget.create.mockResolvedValueOnce({ id: "budget-1", version: 3 });
      const result = await service.createBudget("sch-1", "admin-1", "2026-27");
      expect(result.version).toBe(3);
    });

    it("should start at version 1 when no prior budget exists", async () => {
      mockPrisma.budget.findFirst.mockResolvedValueOnce(null);
      mockPrisma.budget.create.mockResolvedValueOnce({ id: "budget-1", version: 1 });
      const result = await service.createBudget("sch-1", "admin-1", "2026-27");
      expect(result.version).toBe(1);
    });
  });

  describe("addBudgetLineItem", () => {
    it("should add item and recalculate budget total", async () => {
      mockPrisma.budget.findUnique.mockResolvedValueOnce({ id: "budget-1", status: "DRAFT" });
      mockPrisma.budgetLineItem.create.mockResolvedValueOnce({ id: "item-1" });
      mockPrisma.budgetLineItem.aggregate.mockResolvedValueOnce({ _sum: { allocatedAmt: 50000 } });
      mockPrisma.budget.update.mockResolvedValueOnce({ totalAmt: 50000 });

      const result = await service.addBudgetLineItem("budget-1", {
        department: "Science", category: "Lab Equipment",
        allocatedAmt: 50000,
      });
      expect(result.id).toBe("item-1");
      expect(mockPrisma.budget.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { totalAmt: 50000 } })
      );
    });

    it("should throw when budget is not DRAFT", async () => {
      mockPrisma.budget.findUnique.mockResolvedValueOnce({ id: "budget-1", status: "APPROVED" });
      await expect(service.addBudgetLineItem("budget-1", {
        department: "Math", category: "Textbooks", allocatedAmt: 10000,
      })).rejects.toBeInstanceOf(ConflictError);
    });

    it("should throw when budget not found", async () => {
      mockPrisma.budget.findUnique.mockResolvedValueOnce(null);
      await expect(service.addBudgetLineItem("nonexistent", {
        department: "Art", category: "Supplies", allocatedAmt: 5000,
      })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("submitBudgetForApproval", () => {
    it("should update status to PENDING_APPROVAL", async () => {
      mockPrisma.budget.update.mockResolvedValueOnce({ id: "budget-1", status: "PENDING_APPROVAL" });
      const result = await service.submitBudgetForApproval("budget-1");
      expect(result.status).toBe("PENDING_APPROVAL");
    });
  });
});
