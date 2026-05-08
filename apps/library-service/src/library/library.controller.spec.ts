import { Test, TestingModule } from "@nestjs/testing";
import { LibraryController } from "./library.controller";
import { LibraryService } from "./library.service";
import { AuthGuard } from "@nestjs/passport";

describe("LibraryController", () => {
  let controller: LibraryController;
  let service: jest.Mocked<LibraryService>;

  beforeEach(async () => {
    const mockService: jest.Mocked<LibraryService> = {
      createBook: jest.fn(),
      updateBook: jest.fn(),
      searchBooks: jest.fn(),
      issueBook: jest.fn(),
      returnBook: jest.fn(),
      renewIssue: jest.fn(),
      getMemberIssues: jest.fn(),
      getMemberStats: jest.fn(),
      reserveBook: jest.fn(),
      cancelReservation: jest.fn(),
      setFineConfig: jest.fn(),
      getOverdueList: jest.fn(),
      markFinePaid: jest.fn(),
      createEBook: jest.fn(),
      getEBooks: jest.fn(),
      logEBookRead: jest.fn(),
      getEBookReadStats: jest.fn(),
      createPeriodical: jest.fn(),
      recordPeriodicalIssue: jest.fn(),
      getPeriodicals: jest.fn(),
      startStockAudit: jest.fn(),
      recordAuditEntry: jest.fn(),
      completeStockAudit: jest.fn(),
      getAuditReport: jest.fn(),
      suggestBook: jest.fn(),
      reviewRecommendation: jest.fn(),
      getRecommendations: jest.fn(),
      issueInterLibraryLoan: jest.fn(),
      getInterLibraryLoans: jest.fn(),
      createReadingProgram: jest.fn(),
      logReadingEntry: jest.fn(),
      validateReadingEntry: jest.fn(),
      getReadingLeaderboard: jest.fn(),
      getStudentReadingProgress: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibraryController],
      providers: [{ provide: LibraryService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard("jwt"))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LibraryController>(LibraryController);
    service = module.get(LibraryService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("health", () => {
    it("returns ok status", () => {
      expect(controller.health()).toEqual({ status: "ok", service: "library-service" });
    });
  });

  describe("createBook", () => {
    it("delegates to service.createBook with schoolId and body", async () => {
      const body = { title: "Clean Code", author: "Robert Martin", totalCopies: 3 } as any;
      const result = { id: "book-1", title: "Clean Code", availableCopies: 3 };
      service.createBook.mockResolvedValueOnce(result as any);

      const res = await controller.createBook("sch-1", body);
      expect(service.createBook).toHaveBeenCalledWith("sch-1", body);
      expect(res).toBe(result);
    });
  });

  describe("updateBook", () => {
    it("delegates to service.updateBook", async () => {
      service.updateBook.mockResolvedValueOnce({ id: "book-1" } as any);
      await controller.updateBook("book-1", { title: "New Title" } as any);
      expect(service.updateBook).toHaveBeenCalledWith("book-1", { title: "New Title" });
    });
  });

  describe("searchBooks", () => {
    it("passes numeric page and limit to service", async () => {
      service.searchBooks.mockResolvedValueOnce([] as any);
      await controller.searchBooks("sch-1", "Clean Code", "Science", "Martin", "2", "10");
      expect(service.searchBooks).toHaveBeenCalledWith("sch-1", "Clean Code", "Science", "Martin", 2, 10);
    });

    it("uses defaults of page=1 and limit=20 when not provided", async () => {
      service.searchBooks.mockResolvedValueOnce([] as any);
      await controller.searchBooks("sch-1");
      expect(service.searchBooks).toHaveBeenCalledWith("sch-1", undefined, undefined, undefined, 1, 20);
    });
  });

  describe("issueBook", () => {
    it("delegates issueBook call to service", async () => {
      service.issueBook.mockResolvedValueOnce({ id: "issue-1" } as any);
      await controller.issueBook("sch-1", { bookIdOrBarcode: "book-1", memberId: "stu-1", memberRole: "STUDENT", daysOnLoan: 14 });
      expect(service.issueBook).toHaveBeenCalledWith("sch-1", "book-1", "stu-1", "STUDENT", 14);
    });
  });

  describe("returnBook", () => {
    it("delegates to service.returnBook", async () => {
      service.returnBook.mockResolvedValueOnce({ id: "issue-1" } as any);
      await controller.returnBook("issue-1");
      expect(service.returnBook).toHaveBeenCalledWith("issue-1");
    });
  });

  describe("renewIssue", () => {
    it("delegates to service.renewIssue", async () => {
      service.renewIssue.mockResolvedValueOnce({ id: "issue-1" } as any);
      await controller.renewIssue("issue-1", { extraDays: 7 });
      expect(service.renewIssue).toHaveBeenCalledWith("issue-1", 7);
    });
  });

  describe("getMemberIssues", () => {
    it("parses active flag and delegates", async () => {
      service.getMemberIssues.mockResolvedValueOnce([] as any);
      await controller.getMemberIssues("stu-1", "STUDENT", "true");
      expect(service.getMemberIssues).toHaveBeenCalledWith("stu-1", "STUDENT", true);
    });
  });

  describe("getOverdueList", () => {
    it("delegates to service.getOverdueList", async () => {
      service.getOverdueList.mockResolvedValueOnce([] as any);
      await controller.getOverdueList("sch-1");
      expect(service.getOverdueList).toHaveBeenCalledWith("sch-1");
    });
  });

  describe("getAuditReport", () => {
    it("delegates to service.getAuditReport", async () => {
      service.getAuditReport.mockResolvedValueOnce({} as any);
      await controller.getAuditReport("audit-1");
      expect(service.getAuditReport).toHaveBeenCalledWith("audit-1");
    });
  });

  describe("getRecommendations", () => {
    it("delegates with optional status filter", async () => {
      service.getRecommendations.mockResolvedValueOnce([] as any);
      await controller.getRecommendations("sch-1", "PENDING");
      expect(service.getRecommendations).toHaveBeenCalledWith("sch-1", "PENDING");
    });
  });

  describe("getReadingLeaderboard", () => {
    it("delegates to service.getReadingLeaderboard", async () => {
      service.getReadingLeaderboard.mockResolvedValueOnce([] as any);
      await controller.getLeaderboard("prog-1");
      expect(service.getReadingLeaderboard).toHaveBeenCalledWith("prog-1");
    });
  });
});
