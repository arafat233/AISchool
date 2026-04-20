import { Test, TestingModule } from "@nestjs/testing";
import { ReportCardService } from "./report-card.service";

describe("ReportCardService", () => {
  let service: ReportCardService;

  beforeEach(async () => {
    process.env.PUPPETEER_EXECUTABLE_PATH = "";
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportCardService],
    }).compile();
    service = module.get<ReportCardService>(ReportCardService);
  });

  describe("generateHallTicketPDF", () => {
    it("should return a Buffer (HTML fallback when no Chromium)", async () => {
      const result = await service.generateHallTicketPDF({
        exam: { id: "exam-1", name: "Term 1 Exam" },
        student: { firstName: "Ravi", lastName: "Kumar", admissionNo: "ADM-001" },
        schedule: [{ subjectName: "Math", date: "2026-05-10", time: "09:00" }],
        qrDataUrl: "data:image/png;base64,fake",
      });
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should include student name in the generated HTML buffer", async () => {
      const result = await service.generateHallTicketPDF({
        exam: { id: "exam-1", name: "Final Exam" },
        student: { firstName: "Priya", lastName: "Sharma", admissionNo: "ADM-002" },
        schedule: [],
        qrDataUrl: "",
      });
      const html = result.toString("utf8");
      expect(html).toContain("Priya");
    });
  });

  describe("generateReportCardPDF", () => {
    it("should return a Buffer", async () => {
      const result = await service.generateReportCardPDF({
        exam: { id: "exam-1", name: "Term 1" },
        result: {
          student: { firstName: "Ravi", admissionNo: "ADM-001" },
          subjectResults: [{ subjectName: "Math", marksObtained: 85, maxMarks: 100, grade: "A" }],
          totalMarks: 85, totalMaxMarks: 100, percentage: 85, rank: 3,
        },
      });
      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
