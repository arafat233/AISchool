import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError, ValidationError } from "@school-erp/errors";
import { GradingService } from "./grading.service";
import { ReportCardService } from "./report-card.service";
import JSZip from "jszip";
import * as QRCode from "qrcode";
import ExcelJS from "exceljs";

export type ExamStatus = "DRAFT" | "SCHEDULED" | "ONGOING" | "MARKS_ENTRY" | "PUBLISHED" | "ARCHIVED";
export type ExamType = "UNIT_TEST" | "MID_TERM" | "FINAL" | "BOARD" | "INTERNAL";

// ─── Exam CRUD ────────────────────────────────────────────────────────────────

@Injectable()
export class ExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly grading: GradingService,
    private readonly reportCard: ReportCardService,
  ) {}

  async createExam(schoolId: string, data: {
    title: string; type: ExamType; academicYearId: string; term: string; description?: string;
  }) {
    return this.prisma.exam.create({
      data: { schoolId, title: data.title, type: data.type, academicYearId: data.academicYearId, term: data.term, description: data.description, status: "DRAFT" },
    });
  }

  async getExams(schoolId: string, filters?: { academicYearId?: string; status?: ExamStatus; type?: ExamType }) {
    return this.prisma.exam.findMany({
      where: { schoolId, ...(filters?.academicYearId ? { academicYearId: filters.academicYearId } : {}), ...(filters?.status ? { status: filters.status } : {}), ...(filters?.type ? { type: filters.type } : {}) },
      include: { scheduleEntries: { include: { section: true, subject: true }, orderBy: { examDate: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getExam(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: { scheduleEntries: { include: { section: true, subject: true }, orderBy: [{ examDate: "asc" }, { subject: { name: "asc" } }] } },
    });
    if (!exam) throw new NotFoundError("Exam not found");
    return exam;
  }

  async updateExamStatus(id: string, status: ExamStatus) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundError("Exam not found");

    // Status lifecycle guard: valid transitions
    const validTransitions: Record<ExamStatus, ExamStatus[]> = {
      DRAFT:       ["SCHEDULED"],
      SCHEDULED:   ["ONGOING", "DRAFT"],
      ONGOING:     ["MARKS_ENTRY"],
      MARKS_ENTRY: ["PUBLISHED"],
      PUBLISHED:   ["ARCHIVED"],
      ARCHIVED:    [],
    };
    if (!validTransitions[exam.status as ExamStatus].includes(status)) {
      throw new BadRequestException(`Cannot transition exam from ${exam.status} to ${status}`);
    }
    return this.prisma.exam.update({ where: { id }, data: { status } });
  }

  async deleteExam(id: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundError("Exam not found");
    if (exam.status !== "DRAFT") throw new BadRequestException("Only DRAFT exams can be deleted");
    return this.prisma.exam.delete({ where: { id } });
  }

  // ─── Exam Schedule ──────────────────────────────────────────────────────────

  async createScheduleEntry(data: {
    examId: string; sectionId: string; subjectId: string;
    examDate: string; startTime: string; endTime: string;
    maxMarksTheory: number; maxMarksPractical?: number; maxMarksInternal?: number;
    venue?: string; isOnline?: boolean; invigilatorStaffId?: string;
  }) {
    const exam = await this.prisma.exam.findUnique({ where: { id: data.examId } });
    if (!exam) throw new NotFoundError("Exam not found");
    if (exam.status !== "DRAFT" && exam.status !== "SCHEDULED") {
      throw new BadRequestException("Schedule can only be modified while exam is DRAFT or SCHEDULED");
    }

    // Conflict check: same section + subject in same exam
    const conflict = await this.prisma.examScheduleEntry.findFirst({
      where: { examId: data.examId, sectionId: data.sectionId, subjectId: data.subjectId },
    });
    if (conflict) throw new ConflictError("This subject is already scheduled for this section in this exam");

    return this.prisma.examScheduleEntry.create({
      data: {
        examId: data.examId,
        sectionId: data.sectionId,
        subjectId: data.subjectId,
        examDate: new Date(data.examDate),
        startTime: data.startTime,
        endTime: data.endTime,
        maxMarksTheory: data.maxMarksTheory,
        maxMarksPractical: data.maxMarksPractical ?? 0,
        maxMarksInternal: data.maxMarksInternal ?? 0,
        venue: data.venue,
        isOnline: data.isOnline ?? false,
        invigilatorStaffId: data.invigilatorStaffId,
      },
      include: { section: true, subject: true },
    });
  }

  async getSchedule(examId: string) {
    return this.prisma.examScheduleEntry.findMany({
      where: { examId },
      include: { section: true, subject: true, invigilator: { include: { staff: true } } },
      orderBy: [{ examDate: "asc" }, { startTime: "asc" }],
    });
  }

  async deleteScheduleEntry(id: string) {
    return this.prisma.examScheduleEntry.delete({ where: { id } });
  }

  // ─── Hall Ticket ────────────────────────────────────────────────────────────

  async generateHallTicket(examId: string, studentId: string): Promise<Buffer> {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundError("Exam not found");

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { section: true, user: true },
    });
    if (!student) throw new NotFoundError("Student not found");

    // Get schedule entries for the student's section
    const schedule = await this.prisma.examScheduleEntry.findMany({
      where: { examId, sectionId: student.sectionId! },
      include: { subject: true },
      orderBy: { examDate: "asc" },
    });

    // Generate QR code containing hall ticket data
    const hallTicketData = { examId, studentId, rollNo: student.rollNo, timestamp: Date.now() };
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(hallTicketData));

    // Generate HTML-based PDF via ReportCardService
    return this.reportCard.generateHallTicketPDF({
      exam, student, schedule, qrDataUrl,
    });
  }

  async bulkHallTickets(examId: string, sectionId: string): Promise<Buffer> {
    const students = await this.prisma.student.findMany({
      where: { sectionId },
      orderBy: { rollNo: "asc" },
    });

    const zip = new JSZip();
    for (const student of students) {
      const pdfBuffer = await this.generateHallTicket(examId, student.id);
      zip.file(`HallTicket_${student.rollNo ?? student.id}.pdf`, pdfBuffer);
    }

    return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  }

  // ─── Marks Entry ────────────────────────────────────────────────────────────

  async submitMarks(scheduleEntryId: string, marks: {
    studentId: string; theory: number; practical?: number; internal?: number; isAbsent?: boolean;
  }[]) {
    const entry = await this.prisma.examScheduleEntry.findUnique({ where: { id: scheduleEntryId } });
    if (!entry) throw new NotFoundError("Schedule entry not found");

    const exam = await this.prisma.exam.findUnique({ where: { id: entry.examId } });
    if (exam?.status !== "MARKS_ENTRY") {
      throw new BadRequestException("Marks can only be entered when exam is in MARKS_ENTRY status");
    }

    // Validate marks before saving
    for (const m of marks) {
      if (!m.isAbsent) {
        if (m.theory > entry.maxMarksTheory) {
          throw new ValidationError(`Theory marks ${m.theory} exceed maximum ${entry.maxMarksTheory}`);
        }
        if (m.practical !== undefined && m.practical > (entry.maxMarksPractical ?? 0)) {
          throw new ValidationError(`Practical marks ${m.practical} exceed maximum ${entry.maxMarksPractical}`);
        }
        if (m.internal !== undefined && m.internal > (entry.maxMarksInternal ?? 0)) {
          throw new ValidationError(`Internal marks ${m.internal} exceed maximum ${entry.maxMarksInternal}`);
        }
      }
    }

    // Upsert marks for each student
    const ops = marks.map((m) =>
      this.prisma.studentMarks.upsert({
        where: { scheduleEntryId_studentId: { scheduleEntryId, studentId: m.studentId } },
        update: { theory: m.theory, practical: m.practical ?? 0, internal: m.internal ?? 0, isAbsent: m.isAbsent ?? false },
        create: { scheduleEntryId, studentId: m.studentId, theory: m.theory, practical: m.practical ?? 0, internal: m.internal ?? 0, isAbsent: m.isAbsent ?? false },
      }),
    );

    return this.prisma.$transaction(ops);
  }

  async getMarks(scheduleEntryId: string) {
    return this.prisma.studentMarks.findMany({
      where: { scheduleEntryId },
      include: { student: { include: { user: true } } },
      orderBy: { student: { rollNo: "asc" } },
    });
  }

  // ─── Marks Validation ───────────────────────────────────────────────────────

  async validateMarksCompleteness(examId: string): Promise<{ ready: boolean; missing: { sectionId: string; subjectId: string; pendingCount: number }[] }> {
    const entries = await this.prisma.examScheduleEntry.findMany({
      where: { examId },
      include: { marks: true, section: { include: { students: true } } },
    });

    const missing: { sectionId: string; subjectId: string; pendingCount: number }[] = [];

    for (const entry of entries) {
      const totalStudents = entry.section.students.length;
      const enteredCount = entry.marks.length;
      if (enteredCount < totalStudents) {
        missing.push({ sectionId: entry.sectionId, subjectId: entry.subjectId, pendingCount: totalStudents - enteredCount });
      }
    }

    return { ready: missing.length === 0, missing };
  }

  // ─── Grace Marks Policy ─────────────────────────────────────────────────────

  async applyGraceMarks(examId: string, data: { studentId: string; scheduleEntryId: string; graceMarks: number; reason: string; approvedBy: string }) {
    const existing = await this.prisma.studentMarks.findUnique({
      where: { scheduleEntryId_studentId: { scheduleEntryId: data.scheduleEntryId, studentId: data.studentId } },
    });
    if (!existing) throw new NotFoundError("Marks record not found");

    const policy = await this.prisma.graceMarksPolicy.findFirst({
      where: { examId },
    });
    const maxGrace = policy?.maxGracePerSubject ?? 5;

    if (data.graceMarks > maxGrace) {
      throw new ValidationError(`Grace marks cannot exceed ${maxGrace} per subject`);
    }

    // Log the grace marks application
    await this.prisma.graceMarksLog.create({
      data: {
        examId,
        studentId: data.studentId,
        scheduleEntryId: data.scheduleEntryId,
        graceMarks: data.graceMarks,
        reason: data.reason,
        approvedBy: data.approvedBy,
      },
    });

    return this.prisma.studentMarks.update({
      where: { scheduleEntryId_studentId: { scheduleEntryId: data.scheduleEntryId, studentId: data.studentId } },
      data: { grace: data.graceMarks },
    });
  }

  async upsertGraceMarksPolicy(examId: string, data: { maxGracePerSubject: number; maxGraceTotal: number; passingGraceAllowed: boolean }) {
    return this.prisma.graceMarksPolicy.upsert({
      where: { examId },
      update: data,
      create: { examId, ...data },
    });
  }

  // ─── Result Calculation ─────────────────────────────────────────────────────

  async calculateResults(examId: string) {
    const exam = await this.getExam(examId);
    const gradingConfig = await this.prisma.gradingConfig.findFirst({ where: { schoolId: exam.schoolId } });

    // Get all schedule entries with marks
    const entries = await this.prisma.examScheduleEntry.findMany({
      where: { examId },
      include: { marks: true, subject: true },
    });

    // Group marks by student
    const studentMap = new Map<string, { subjectId: string; subjectName: string; theory: number; practical: number; internal: number; grace: number; maxTheory: number; maxPractical: number; maxInternal: number; isAbsent: boolean }[]>();

    for (const entry of entries) {
      for (const mark of entry.marks) {
        if (!studentMap.has(mark.studentId)) studentMap.set(mark.studentId, []);
        studentMap.get(mark.studentId)!.push({
          subjectId: entry.subjectId,
          subjectName: entry.subject.name,
          theory: mark.theory,
          practical: mark.practical,
          internal: mark.internal,
          grace: mark.grace ?? 0,
          maxTheory: entry.maxMarksTheory,
          maxPractical: entry.maxMarksPractical,
          maxInternal: entry.maxMarksInternal,
          isAbsent: mark.isAbsent,
        });
      }
    }

    const results: { studentId: string; total: number; maxTotal: number; percentage: number; grade: string; isPassed: boolean; subjectResults: unknown }[] = [];

    for (const [studentId, subjects] of studentMap) {
      let total = 0;
      let maxTotal = 0;
      let allPassed = true;

      const subjectResults = subjects.map((s) => {
        const obtained = s.isAbsent ? 0 : (s.theory + s.practical + s.internal + s.grace);
        const maxMarks = s.maxTheory + s.maxPractical + s.maxInternal;
        const pct = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0;
        const grade = this.grading.getGrade(pct, gradingConfig);
        const passingPct = gradingConfig?.passingPercentage ?? 33;
        const passed = !s.isAbsent && pct >= passingPct;
        if (!passed) allPassed = false;

        total += obtained;
        maxTotal += maxMarks;

        return { subjectId: s.subjectId, subjectName: s.subjectName, obtained, maxMarks, percentage: +pct.toFixed(2), grade, passed, isAbsent: s.isAbsent };
      });

      const percentage = maxTotal > 0 ? +((total / maxTotal) * 100).toFixed(2) : 0;
      const overallGrade = this.grading.getGrade(percentage, gradingConfig);
      results.push({ studentId, total, maxTotal, percentage, grade: overallGrade, isPassed: allPassed, subjectResults });
    }

    // Compute section ranks
    const sortedByTotal = [...results].sort((a, b) => b.total - a.total);
    const rankedResults = results.map((r) => ({
      ...r,
      sectionRank: sortedByTotal.findIndex((s) => s.studentId === r.studentId) + 1,
    }));

    // Persist results
    const ops = rankedResults.map((r) =>
      this.prisma.examResult.upsert({
        where: { examId_studentId: { examId, studentId: r.studentId } },
        update: { total: r.total, maxTotal: r.maxTotal, percentage: r.percentage, grade: r.grade, isPassed: r.isPassed, sectionRank: r.sectionRank, subjectResults: r.subjectResults as any },
        create: { examId, studentId: r.studentId, total: r.total, maxTotal: r.maxTotal, percentage: r.percentage, grade: r.grade, isPassed: r.isPassed, sectionRank: r.sectionRank, subjectResults: r.subjectResults as any },
      }),
    );

    await this.prisma.$transaction(ops);
    return rankedResults;
  }

  async getResult(examId: string, studentId: string) {
    const result = await this.prisma.examResult.findUnique({
      where: { examId_studentId: { examId, studentId } },
      include: { student: { include: { user: true, section: true } } },
    });
    if (!result) throw new NotFoundError("Result not found");
    return result;
  }

  async getSectionResults(examId: string, sectionId: string) {
    return this.prisma.examResult.findMany({
      where: { examId, student: { sectionId } },
      include: { student: { include: { user: true } } },
      orderBy: { sectionRank: "asc" },
    });
  }

  // ─── Publish Results ────────────────────────────────────────────────────────

  async publishResults(examId: string) {
    const { ready, missing } = await this.validateMarksCompleteness(examId);
    if (!ready) {
      throw new BadRequestException(
        `Cannot publish: marks missing for ${missing.length} schedule entry/entries. Complete marks entry first.`,
      );
    }

    // Calculate results if not already done
    await this.calculateResults(examId);
    await this.updateExamStatus(examId, "PUBLISHED");

    // Emit result.published event for Notification Service
    // In production: emit via RabbitMQ/Redis event bus
    // EventEmitter2 or @school-erp/events would handle this
    const exam = await this.getExam(examId);
    const results = await this.prisma.examResult.findMany({ where: { examId } });

    // Log the publish event
    await this.prisma.examResult.updateMany({
      where: { examId },
      data: { publishedAt: new Date() },
    });

    return { message: "Results published successfully", examTitle: exam.title, totalStudents: results.length };
  }

  // ─── Grading Config ─────────────────────────────────────────────────────────

  async upsertGradingConfig(schoolId: string, data: {
    scale: "CBSE" | "ICSE" | "DISTINCTION_PASS" | "CUSTOM";
    passingPercentage: number;
    grades: { label: string; minPercent: number; maxPercent: number; points?: number }[];
  }) {
    return this.prisma.gradingConfig.upsert({
      where: { schoolId },
      update: { scale: data.scale, passingPercentage: data.passingPercentage, grades: data.grades as any },
      create: { schoolId, scale: data.scale, passingPercentage: data.passingPercentage, grades: data.grades as any },
    });
  }

  async getGradingConfig(schoolId: string) {
    return this.prisma.gradingConfig.findFirst({ where: { schoolId } });
  }

  // ─── Report Card PDF ────────────────────────────────────────────────────────

  async generateReportCard(examId: string, studentId: string): Promise<Buffer> {
    const result = await this.getResult(examId, studentId);
    const exam = await this.getExam(examId);
    return this.reportCard.generateReportCardPDF({ exam, result });
  }

  async bulkReportCards(examId: string, sectionId: string): Promise<Buffer> {
    const results = await this.getSectionResults(examId, sectionId);
    const zip = new JSZip();

    for (const result of results) {
      const pdfBuffer = await this.generateReportCard(examId, result.studentId);
      const rollNo = (result.student as any)?.rollNo ?? result.studentId;
      zip.file(`ReportCard_${rollNo}.pdf`, pdfBuffer);
    }

    return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  }

  // ─── Board Exam Registration ─────────────────────────────────────────────────

  async exportBoardRegistration(examId: string, format: "excel" | "xml"): Promise<Buffer> {
    const exam = await this.getExam(examId);
    const entries = await this.prisma.examScheduleEntry.findMany({
      where: { examId },
      include: {
        section: {
          include: {
            students: {
              include: { user: true },
              orderBy: { rollNo: "asc" },
            },
          },
        },
        subject: true,
      },
    });

    // Collect unique students across all entries
    const studentSet = new Map<string, { id: string; rollNo: string | null; firstName: string; lastName: string; dob: string; gender: string; sectionName: string }>();
    for (const entry of entries) {
      for (const student of entry.section.students) {
        if (!studentSet.has(student.id)) {
          studentSet.set(student.id, {
            id: student.id,
            rollNo: student.rollNo,
            firstName: (student.user as any)?.firstName ?? "",
            lastName: (student.user as any)?.lastName ?? "",
            dob: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split("T")[0] : "",
            gender: student.gender ?? "",
            sectionName: entry.section.name,
          });
        }
      }
    }

    const students = [...studentSet.values()];

    if (format === "excel") {
      return this.generateBoardExcel(students, exam);
    }
    return this.generateBoardXML(students, exam);
  }

  private async generateBoardExcel(students: unknown[], _exam: unknown): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Board Registration");

    sheet.columns = [
      { header: "Roll No", key: "rollNo", width: 15 },
      { header: "First Name", key: "firstName", width: 20 },
      { header: "Last Name", key: "lastName", width: 20 },
      { header: "Date of Birth", key: "dob", width: 15 },
      { header: "Gender", key: "gender", width: 10 },
      { header: "Section", key: "sectionName", width: 15 },
    ];

    for (const student of students as any[]) {
      sheet.addRow(student);
    }

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A3A5C" } };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async generateBoardXML(students: unknown[], exam: any): Promise<Buffer> {
    const rows = (students as any[]).map(
      (s) => `  <Student rollNo="${s.rollNo}" firstName="${s.firstName}" lastName="${s.lastName}" dob="${s.dob}" gender="${s.gender}" section="${s.sectionName}" />`,
    ).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<BoardRegistration examTitle="${exam.title}" examType="${exam.type}" generatedAt="${new Date().toISOString()}">
${rows}
</BoardRegistration>`;

    return Buffer.from(xml, "utf-8");
  }
}
