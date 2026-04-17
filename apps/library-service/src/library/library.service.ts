import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";

const BORROWING_LIMITS: Record<string, number> = { STUDENT: 2, STAFF: 5 };
const HOLD_HOURS = 48;

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── [1/12] Book catalogue CRUD ──────────────────────────────────────────

  async createBook(schoolId: string, data: {
    title: string; author: string; isbn?: string; publisher?: string; category?: string;
    shelfLocation?: string; barcode?: string; rfidTag?: string; totalCopies?: number;
    language?: string; publishedYear?: number; description?: string; coverUrl?: string;
  }) {
    const copies = data.totalCopies ?? 1;
    return this.prisma.book.create({ data: { schoolId, ...data, totalCopies: copies, availableCopies: copies } });
  }

  async updateBook(bookId: string, data: Partial<{ title: string; author: string; publisher: string; category: string; shelfLocation: string; totalCopies: number; isActive: boolean }>) {
    return this.prisma.book.update({ where: { id: bookId }, data });
  }

  async searchBooks(schoolId: string, q?: string, category?: string, author?: string) {
    return this.prisma.book.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { isbn: { contains: q } }, { barcode: { contains: q } }] } : {}),
        ...(category ? { category } : {}),
        ...(author ? { author: { contains: author, mode: "insensitive" } } : {}),
      },
      orderBy: { title: "asc" },
    });
  }

  // ─── [2/12] RFID/barcode issue and return ─────────────────────────────────

  async issueBook(schoolId: string, bookIdOrBarcode: string, memberId: string, memberRole: string, daysOnLoan = 14) {
    // Resolve by barcode or id
    const book = await this.prisma.book.findFirst({
      where: { schoolId, OR: [{ id: bookIdOrBarcode }, { barcode: bookIdOrBarcode }, { rfidTag: bookIdOrBarcode }] },
    });
    if (!book) throw new NotFoundError("Book not found");
    if (book.availableCopies < 1) throw new ConflictError("No copies available — please reserve");

    // Borrowing limit check
    const activeCount = await this.prisma.bookIssue.count({
      where: { memberId, memberRole, returnedAt: null },
    });
    const limit = BORROWING_LIMITS[memberRole] ?? 2;
    if (activeCount >= limit) throw new ConflictError(`Borrowing limit reached (${limit} books for ${memberRole})`);

    const dueDate = new Date(Date.now() + daysOnLoan * 86_400_000);
    const [issue] = await this.prisma.$transaction([
      this.prisma.bookIssue.create({ data: { schoolId, bookId: book.id, memberId, memberRole, dueDate } }),
      this.prisma.book.update({ where: { id: book.id }, data: { availableCopies: { decrement: 1 } } }),
    ]);

    // Fulfil any pending reservation
    const reservation = await this.prisma.bookReservation.findFirst({
      where: { bookId: book.id, memberId, status: "NOTIFIED" },
    });
    if (reservation) {
      await this.prisma.bookReservation.update({ where: { id: reservation.id }, data: { status: "FULFILLED" } });
    }

    return issue;
  }

  async returnBook(issueId: string) {
    const issue = await this.prisma.bookIssue.findUnique({ where: { id: issueId }, include: { book: true } });
    if (!issue) throw new NotFoundError("Issue record not found");
    if (issue.returnedAt) throw new ConflictError("Book already returned");

    const now = new Date();
    let fine = 0;

    // Fine calculation
    if (now > issue.dueDate) {
      const config = await this.prisma.libraryFineConfig.findUnique({ where: { schoolId: issue.schoolId } });
      const rate = config ? Number(config.dailyRateRs) : 1;
      const grace = config?.graceDays ?? 0;
      const overdueDays = Math.max(0, Math.floor((now.getTime() - issue.dueDate.getTime()) / 86_400_000) - grace);
      fine = overdueDays * rate;
      if (config?.maxFineRs) fine = Math.min(fine, Number(config.maxFineRs));
    }

    const [returned] = await this.prisma.$transaction([
      this.prisma.bookIssue.update({
        where: { id: issueId },
        data: { returnedAt: now, fineAmountRs: fine > 0 ? fine : undefined },
      }),
      this.prisma.book.update({ where: { id: issue.bookId }, data: { availableCopies: { increment: 1 } } }),
    ]);

    // Notify first pending reservation
    await this._notifyNextReservation(issue.bookId);

    return { ...returned, fineAmountRs: fine };
  }

  async renewIssue(issueId: string, extraDays = 7) {
    const issue = await this.prisma.bookIssue.findUnique({ where: { id: issueId } });
    if (!issue || issue.returnedAt) throw new ConflictError("Cannot renew this issue");
    if (issue.renewalCount >= 2) throw new ConflictError("Maximum renewals (2) reached");

    const newDue = new Date(Math.max(issue.dueDate.getTime(), Date.now()) + extraDays * 86_400_000);
    return this.prisma.bookIssue.update({
      where: { id: issueId },
      data: { dueDate: newDue, renewalCount: { increment: 1 } },
    });
  }

  // ─── [3/12] Member management ─────────────────────────────────────────────

  async getMemberIssues(memberId: string, memberRole: string, active = true) {
    return this.prisma.bookIssue.findMany({
      where: { memberId, memberRole, ...(active ? { returnedAt: null } : {}) },
      include: { book: true },
      orderBy: { issuedAt: "desc" },
    });
  }

  async getMemberStats(schoolId: string, memberId: string, memberRole: string) {
    const limit = BORROWING_LIMITS[memberRole] ?? 2;
    const [active, total, overdue] = await Promise.all([
      this.prisma.bookIssue.count({ where: { memberId, returnedAt: null } }),
      this.prisma.bookIssue.count({ where: { memberId } }),
      this.prisma.bookIssue.count({ where: { memberId, returnedAt: null, dueDate: { lt: new Date() } } }),
    ]);
    return { memberId, memberRole, limit, active, remaining: limit - active, total, overdue };
  }

  // ─── [4/12] Reservation / hold ────────────────────────────────────────────

  async reserveBook(schoolId: string, bookId: string, memberId: string, memberRole: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundError("Book not found");

    // If available, issue directly instead
    if (book.availableCopies > 0) {
      throw new ConflictError("Book is available — please issue it directly");
    }

    const existing = await this.prisma.bookReservation.findFirst({
      where: { bookId, memberId, status: { in: ["PENDING", "NOTIFIED"] } },
    });
    if (existing) throw new ConflictError("You already have a pending reservation for this book");

    return this.prisma.bookReservation.create({ data: { schoolId, bookId, memberId, memberRole, expiresAt: new Date(Date.now() + HOLD_HOURS * 3_600_000) } });
  }

  async cancelReservation(reservationId: string) {
    return this.prisma.bookReservation.update({ where: { id: reservationId }, data: { status: "CANCELLED" } });
  }

  private async _notifyNextReservation(bookId: string) {
    const next = await this.prisma.bookReservation.findFirst({
      where: { bookId, status: "PENDING" },
      orderBy: { reservedAt: "asc" },
    });
    if (next) {
      await this.prisma.bookReservation.update({
        where: { id: next.id },
        data: { status: "NOTIFIED", notifiedAt: new Date(), expiresAt: new Date(Date.now() + HOLD_HOURS * 3_600_000) },
      });
      console.log(`[LIBRARY] Book ${bookId} available — notified member ${next.memberId}. Hold expires in ${HOLD_HOURS}h`);
      // Production: push notification to member
    }
  }

  // ─── [5/12] Overdue fine calculation ──────────────────────────────────────

  async setFineConfig(schoolId: string, dailyRateRs: number, graceDays = 0, maxFineRs?: number) {
    return this.prisma.libraryFineConfig.upsert({
      where: { schoolId },
      create: { schoolId, dailyRateRs, graceDays, maxFineRs },
      update: { dailyRateRs, graceDays, maxFineRs },
    });
  }

  async getOverdueList(schoolId: string) {
    const issues = await this.prisma.bookIssue.findMany({
      where: { schoolId, returnedAt: null, dueDate: { lt: new Date() } },
      include: { book: true },
      orderBy: { dueDate: "asc" },
    });
    const config = await this.prisma.libraryFineConfig.findUnique({ where: { schoolId } });
    const rate = config ? Number(config.dailyRateRs) : 1;
    const grace = config?.graceDays ?? 0;

    return issues.map((i) => {
      const overdueDays = Math.max(0, Math.floor((Date.now() - i.dueDate.getTime()) / 86_400_000) - grace);
      let fine = overdueDays * rate;
      if (config?.maxFineRs) fine = Math.min(fine, Number(config.maxFineRs));
      return { ...i, overdueDays, estimatedFineRs: fine };
    });
  }

  async markFinePaid(issueId: string) {
    return this.prisma.bookIssue.update({ where: { id: issueId }, data: { finePaid: true } });
  }

  // ─── [6/12] Digital library catalogue ────────────────────────────────────

  async createEBook(schoolId: string, data: { title: string; author?: string; subject?: string; gradeLevel?: string; url: string; source?: string }) {
    return this.prisma.eBook.create({ data: { schoolId, ...data } });
  }

  async getEBooks(schoolId: string, subject?: string, gradeLevel?: string) {
    return this.prisma.eBook.findMany({
      where: { schoolId, isActive: true, ...(subject ? { subject } : {}), ...(gradeLevel ? { gradeLevel } : {}) },
      orderBy: { title: "asc" },
    });
  }

  async logEBookRead(ebookId: string, studentId: string, minutesRead: number) {
    return this.prisma.eBookReadLog.create({ data: { ebookId, studentId, minutesRead } });
  }

  async getEBookReadStats(studentId: string, schoolId: string) {
    const logs = await this.prisma.eBookReadLog.findMany({ where: { studentId }, include: { ebook: { select: { schoolId: true, title: true } } } });
    const filtered = logs.filter((l) => l.ebook.schoolId === schoolId);
    const totalMinutes = filtered.reduce((s, l) => s + l.minutesRead, 0);
    return { studentId, totalSessions: filtered.length, totalMinutes, books: [...new Set(filtered.map((l) => l.ebook.title))] };
  }

  // ─── [7/12] Periodicals register ─────────────────────────────────────────

  async createPeriodical(schoolId: string, data: { name: string; type: string; publisher?: string; frequency?: string; subscriptionStartDate?: Date; subscriptionEndDate?: Date }) {
    return this.prisma.periodical.create({ data: { schoolId, ...data } });
  }

  async recordPeriodicalIssue(periodicalId: string, data: { issueDate: Date; issueNo?: string; volumeNo?: string; notes?: string }) {
    return this.prisma.periodicalIssueRecord.create({ data: { periodicalId, ...data } });
  }

  async getPeriodicals(schoolId: string) {
    return this.prisma.periodical.findMany({
      where: { schoolId, isActive: true },
      include: { issueRecords: { orderBy: { issueDate: "desc" }, take: 5 } },
      orderBy: { name: "asc" },
    });
  }

  // ─── [8/12] Annual stock audit ────────────────────────────────────────────

  async startStockAudit(schoolId: string, conductedBy: string) {
    return this.prisma.stockAudit.create({ data: { schoolId, auditDate: new Date(), conductedBy } });
  }

  async recordAuditEntry(auditId: string, bookId: string, physicalCount: number) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundError("Book not found");

    return this.prisma.stockAuditEntry.create({
      data: {
        auditId, bookId, bookTitle: book.title,
        systemCount: book.totalCopies,
        physicalCount,
        discrepancy: physicalCount - book.totalCopies,
      },
    });
  }

  async completeStockAudit(auditId: string, notes?: string) {
    const entries = await this.prisma.stockAuditEntry.findMany({ where: { auditId } });
    const discrepancies = entries.filter((e) => e.discrepancy !== 0).map((e) => ({
      bookId: e.bookId, bookTitle: e.bookTitle,
      systemCount: e.systemCount, physicalCount: e.physicalCount, diff: e.discrepancy,
    }));

    return this.prisma.stockAudit.update({
      where: { id: auditId },
      data: { status: "COMPLETE", completedAt: new Date(), totalBooks: entries.length, discrepancies, notes },
    });
  }

  async getAuditReport(auditId: string) {
    return this.prisma.stockAudit.findUnique({ where: { id: auditId }, include: { entries: true } });
  }

  // ─── [9/12] Book purchase recommendation ─────────────────────────────────

  async suggestBook(schoolId: string, data: { bookId?: string; suggestedTitle?: string; suggestedAuthor?: string; suggestedIsbn?: string; suggestedBy: string; suggestedByRole: string; reason?: string }) {
    return this.prisma.bookRecommendation.create({ data: { schoolId, ...data } });
  }

  async reviewRecommendation(id: string, action: "APPROVED" | "REJECTED", approvedBy: string, purchaseOrderRef?: string) {
    return this.prisma.bookRecommendation.update({
      where: { id },
      data: { status: action === "APPROVED" ? (purchaseOrderRef ? "ORDERED" : "APPROVED") : "REJECTED", approvedBy, purchaseOrderRef },
    });
  }

  async getRecommendations(schoolId: string, status?: string) {
    return this.prisma.bookRecommendation.findMany({
      where: { schoolId, ...(status ? { status } : {}) },
      include: { book: { select: { title: true, author: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // ─── [10/12] Inter-library loan ───────────────────────────────────────────

  async issueInterLibraryLoan(schoolId: string, bookId: string, memberId: string, memberRole: string, partnerSchoolId: string, daysOnLoan = 14) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundError("Book not found");

    const dueDate = new Date(Date.now() + daysOnLoan * 86_400_000);
    return this.prisma.bookIssue.create({
      data: { schoolId, bookId, memberId, memberRole, dueDate, isInterLibrary: true, partnerSchoolId },
    });
  }

  async getInterLibraryLoans(schoolId: string) {
    return this.prisma.bookIssue.findMany({
      where: { schoolId, isInterLibrary: true, returnedAt: null },
      include: { book: true },
      orderBy: { dueDate: "asc" },
    });
  }

  // ─── [11/12] Reading program ──────────────────────────────────────────────

  async createReadingProgram(schoolId: string, data: { academicYear: string; targetBooks: number; startDate: Date; endDate: Date }) {
    return this.prisma.readingProgram.upsert({
      where: { schoolId_academicYear: { schoolId, academicYear: data.academicYear } },
      create: { schoolId, ...data },
      update: data,
    });
  }

  async logReadingEntry(programId: string, studentId: string, data: { bookId?: string; bookTitle: string; bookAuthor?: string; rating?: number; review?: string }) {
    return this.prisma.readingLog.create({ data: { programId, studentId, ...data } });
  }

  async validateReadingEntry(logId: string, validatedBy: string) {
    return this.prisma.readingLog.update({
      where: { id: logId },
      data: { isValidated: true, validatedBy, completedAt: new Date() },
    });
  }

  async getReadingLeaderboard(programId: string) {
    const logs = await this.prisma.readingLog.findMany({
      where: { programId, isValidated: true },
      select: { studentId: true },
    });
    const tally: Record<string, number> = {};
    for (const l of logs) tally[l.studentId] = (tally[l.studentId] ?? 0) + 1;

    const program = await this.prisma.readingProgram.findUnique({ where: { id: programId } });
    return Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .map(([studentId, count], i) => ({
        rank: i + 1, studentId, booksRead: count,
        targetMet: program ? count >= program.targetBooks : false,
      }));
  }

  async getStudentReadingProgress(programId: string, studentId: string) {
    const program = await this.prisma.readingProgram.findUnique({ where: { id: programId } });
    if (!program) throw new NotFoundError("Reading program not found");

    const [all, validated] = await Promise.all([
      this.prisma.readingLog.count({ where: { programId, studentId } }),
      this.prisma.readingLog.count({ where: { programId, studentId, isValidated: true } }),
    ]);

    return {
      studentId, programId, target: program.targetBooks,
      logged: all, validated, remaining: Math.max(0, program.targetBooks - validated),
      targetMet: validated >= program.targetBooks,
    };
  }

  // ─── [12/12] Dockerfile scaffolded separately ─────────────────────────────
}
