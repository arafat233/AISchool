import { Injectable } from "@nestjs/common";

interface HallTicketData {
  exam: any;
  student: any;
  schedule: any[];
  qrDataUrl: string;
}

interface ReportCardData {
  exam: any;
  result: any;
}

@Injectable()
export class ReportCardService {
  /**
   * Generates a hall ticket PDF as a Buffer.
   * Uses Puppeteer to render HTML → PDF in production.
   * Falls back to a structured HTML buffer when Chrome is unavailable (CI / dev without Chromium).
   */
  async generateHallTicketPDF(data: HallTicketData): Promise<Buffer> {
    const html = this.buildHallTicketHTML(data);
    return this.renderHTMLtoPDF(html);
  }

  /**
   * Generates a school-branded report card PDF as a Buffer.
   */
  async generateReportCardPDF(data: ReportCardData): Promise<Buffer> {
    const html = this.buildReportCardHTML(data);
    return this.renderHTMLtoPDF(html);
  }

  private async renderHTMLtoPDF(html: string): Promise<Buffer> {
    try {
      // Attempt Puppeteer rendering (requires Chrome/Chromium at PUPPETEER_EXECUTABLE_PATH)
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      if (!executablePath) throw new Error("No Chromium path configured");

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const puppeteer = require("puppeteer-core");
      const browser = await puppeteer.launch({ executablePath, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" } });
      await browser.close();
      return Buffer.from(pdf);
    } catch {
      // Fallback: return the HTML itself as a buffer (renders in browser, useful in dev)
      return Buffer.from(html, "utf-8");
    }
  }

  private buildHallTicketHTML(data: HallTicketData): string {
    const { exam, student, schedule, qrDataUrl } = data;
    const scheduleRows = schedule.map((s: any) => `
      <tr>
        <td>${s.subject?.name ?? "—"}</td>
        <td>${s.examDate ? new Date(s.examDate).toLocaleDateString("en-IN") : "—"}</td>
        <td>${s.startTime ?? "—"} – ${s.endTime ?? "—"}</td>
        <td>${s.venue ?? "Main Hall"}</td>
        <td>${s.maxMarksTheory + (s.maxMarksPractical ?? 0) + (s.maxMarksInternal ?? 0)}</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Hall Ticket — ${exam?.title ?? "Exam"}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 0; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #1a3a5c; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 20px; color: #1a3a5c; margin: 0 0 4px; }
    .header h2 { font-size: 14px; margin: 0; color: #666; }
    .student-info { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
    .info-item { display: flex; gap: 6px; }
    .info-label { font-weight: bold; min-width: 100px; color: #555; }
    .qr { width: 100px; height: 100px; border: 1px solid #ddd; padding: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    th { background: #1a3a5c; color: white; font-size: 11px; }
    tr:nth-child(even) { background: #f5f8ff; }
    .footer { margin-top: 24px; display: flex; justify-content: space-between; font-size: 11px; color: #999; }
    .sig-line { border-top: 1px solid #555; padding-top: 4px; text-align: center; width: 160px; font-size: 11px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>HALL TICKET</h1>
    <h2>${exam?.title ?? "Examination"}</h2>
  </div>
  <div class="student-info">
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Student Name:</span><span>${student?.user?.firstName ?? ""} ${student?.user?.lastName ?? ""}</span></div>
      <div class="info-item"><span class="info-label">Roll No:</span><span>${student?.rollNo ?? "—"}</span></div>
      <div class="info-item"><span class="info-label">Class & Section:</span><span>${student?.section?.gradeLevel?.name ?? ""} – ${student?.section?.name ?? ""}</span></div>
      <div class="info-item"><span class="info-label">Exam Term:</span><span>${exam?.term ?? "—"}</span></div>
      <div class="info-item"><span class="info-label">Academic Year:</span><span>${exam?.academicYear?.name ?? "—"}</span></div>
    </div>
    <img class="qr" src="${qrDataUrl}" alt="QR Code" />
  </div>
  <table>
    <thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Venue</th><th>Max Marks</th></tr></thead>
    <tbody>${scheduleRows}</tbody>
  </table>
  <div class="footer">
    <div class="sig-line">Principal's Signature</div>
    <div style="font-size:10px;color:#bbb;">Generated: ${new Date().toLocaleString("en-IN")}</div>
    <div class="sig-line">Exam Controller</div>
  </div>
</body>
</html>`;
  }

  private buildReportCardHTML(data: ReportCardData): string {
    const { exam, result } = data;
    const student = result?.student;
    const subjectResults: any[] = result?.subjectResults ?? [];

    const subjectRows = subjectResults.map((s: any) => `
      <tr>
        <td>${s.subjectName ?? "—"}</td>
        <td>${s.isAbsent ? "AB" : s.obtained}</td>
        <td>${s.maxMarks}</td>
        <td>${s.isAbsent ? "—" : s.percentage + "%"}</td>
        <td class="grade">${s.isAbsent ? "AB" : s.grade}</td>
        <td>${s.passed ? "✓" : "✗"}</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Report Card — ${student?.user?.firstName ?? ""} ${student?.user?.lastName ?? ""}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 0; padding: 20px; }
    .header { text-align: center; border-bottom: 3px solid #1a3a5c; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 20px; color: #1a3a5c; margin: 0 0 4px; }
    .header h2 { font-size: 13px; color: #666; margin: 0; }
    .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 16px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .info-item { display: flex; gap: 6px; }
    .info-label { font-weight: bold; min-width: 110px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ccc; padding: 7px 10px; text-align: left; }
    th { background: #1a3a5c; color: white; font-size: 11px; }
    tr:nth-child(even) { background: #f5f8ff; }
    .grade { font-weight: bold; color: #1a3a5c; }
    .summary { margin-top: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; text-align: center; }
    .summary-card .val { font-size: 20px; font-weight: bold; color: #1a3a5c; }
    .summary-card .lbl { font-size: 10px; color: #999; margin-top: 2px; }
    .footer { margin-top: 24px; display: flex; justify-content: space-between; }
    .sig-line { border-top: 1px solid #555; padding-top: 4px; text-align: center; width: 160px; font-size: 11px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PROGRESS REPORT CARD</h1>
    <h2>${exam?.title ?? "Examination"} · Academic Year ${exam?.academicYear?.name ?? "—"}</h2>
  </div>
  <div class="student-info">
    <div class="info-item"><span class="info-label">Student Name:</span><span>${student?.user?.firstName ?? ""} ${student?.user?.lastName ?? ""}</span></div>
    <div class="info-item"><span class="info-label">Roll No:</span><span>${student?.rollNo ?? "—"}</span></div>
    <div class="info-item"><span class="info-label">Class & Section:</span><span>${student?.section?.gradeLevel?.name ?? ""} – ${student?.section?.name ?? ""}</span></div>
    <div class="info-item"><span class="info-label">Section Rank:</span><span>${result?.sectionRank ?? "—"}</span></div>
  </div>
  <table>
    <thead><tr><th>Subject</th><th>Marks Obtained</th><th>Max Marks</th><th>Percentage</th><th>Grade</th><th>Result</th></tr></thead>
    <tbody>${subjectRows}</tbody>
  </table>
  <div class="summary">
    <div class="summary-card"><div class="val">${result?.total ?? "—"} / ${result?.maxTotal ?? "—"}</div><div class="lbl">Total Marks</div></div>
    <div class="summary-card"><div class="val">${result?.percentage ?? "—"}%</div><div class="lbl">Overall Percentage</div></div>
    <div class="summary-card"><div class="val">${result?.grade ?? "—"}</div><div class="lbl">Overall Grade</div></div>
    <div class="summary-card"><div class="val">${result?.isPassed ? "PASS" : "FAIL"}</div><div class="lbl">Result</div></div>
  </div>
  <div class="footer">
    <div class="sig-line">Class Teacher</div>
    <div style="font-size:10px;color:#bbb;">Generated: ${new Date().toLocaleString("en-IN")}</div>
    <div class="sig-line">Principal</div>
  </div>
</body>
</html>`;
  }
}
