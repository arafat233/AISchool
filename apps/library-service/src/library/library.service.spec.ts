import { Test, TestingModule } from "@nestjs/testing";
import { LibraryService } from "./library.service";
import { NotFoundError, ConflictError } from "@school-erp/errors";

const mockPrisma = {
  book: {
    create: jest.fn(), update: jest.fn(), findMany: jest.fn(),
    findFirst: jest.fn(), findUnique: jest.fn(),
  },
  bookIssue: { create: jest.fn(), count: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  bookReservation: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn(),
};

const mockBook = { id: "book-1", title: "Clean Code", availableCopies: 2, totalCopies: 3 };

describe("LibraryService", () => {
  let service: LibraryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [LibraryService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<LibraryService>(LibraryService);
  });

  describe("createBook", () => {
    it("should set availableCopies equal to totalCopies", async () => {
      mockPrisma.book.create.mockResolvedValueOnce({ id: "book-1", totalCopies: 3, availableCopies: 3 });
      const result = await service.createBook("sch-1", {
        title: "Clean Code", author: "Robert Martin", totalCopies: 3,
      });
      expect(result.availableCopies).toBe(3);
      const createCall = mockPrisma.book.create.mock.calls[0][0];
      expect(createCall.data.availableCopies).toBe(3);
    });

    it("should default totalCopies to 1 when not provided", async () => {
      mockPrisma.book.create.mockResolvedValueOnce({ id: "book-2", totalCopies: 1, availableCopies: 1 });
      await service.createBook("sch-1", { title: "Refactoring", author: "Martin Fowler" });
      const createCall = mockPrisma.book.create.mock.calls[0][0];
      expect(createCall.data.totalCopies).toBe(1);
    });
  });

  describe("issueBook", () => {
    it("should issue book and decrement availableCopies", async () => {
      mockPrisma.book.findFirst.mockResolvedValueOnce(mockBook);
      mockPrisma.bookIssue.count.mockResolvedValueOnce(0); // under limit
      mockPrisma.$transaction.mockImplementationOnce(async (ops: any[]) => [{ id: "issue-1" }, {}]);
      mockPrisma.bookReservation.findFirst.mockResolvedValueOnce(null);

      const result = await service.issueBook("sch-1", "book-1", "stu-1", "STUDENT");
      expect(result.id).toBe("issue-1");
    });

    it("should throw ConflictError when no copies available", async () => {
      mockPrisma.book.findFirst.mockResolvedValueOnce({ ...mockBook, availableCopies: 0 });
      await expect(service.issueBook("sch-1", "book-1", "stu-1", "STUDENT")).rejects.toBeInstanceOf(ConflictError);
    });

    it("should throw ConflictError when student borrowing limit reached", async () => {
      mockPrisma.book.findFirst.mockResolvedValueOnce(mockBook);
      mockPrisma.bookIssue.count.mockResolvedValueOnce(2); // limit is 2 for STUDENT
      await expect(service.issueBook("sch-1", "book-1", "stu-1", "STUDENT")).rejects.toBeInstanceOf(ConflictError);
    });

    it("should throw NotFoundError when book not found", async () => {
      mockPrisma.book.findFirst.mockResolvedValueOnce(null);
      await expect(service.issueBook("sch-1", "unknown", "stu-1", "STUDENT")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("searchBooks", () => {
    it("should filter by title, ISBN, or barcode when query provided", async () => {
      mockPrisma.book.findMany.mockResolvedValueOnce([mockBook]);
      await service.searchBooks("sch-1", "Clean Code");
      expect(mockPrisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) })
      );
    });

    it("should filter by category when provided", async () => {
      mockPrisma.book.findMany.mockResolvedValueOnce([]);
      await service.searchBooks("sch-1", undefined, "Science");
      expect(mockPrisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ category: "Science" }) })
      );
    });
  });
});
