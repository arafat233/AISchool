import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
// @ts-ignore — pdfkit CommonJS module
import PDFDocument from "pdfkit";

const prisma = new PrismaClient();

function decodeUser(req: NextRequest): { userId: string; name: string } | null {
  const token = req.cookies.get("access_token")?.value;
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const p = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    return { userId: p.sub, name: p.email?.split("@")[0] ?? "Student" };
  } catch { return null; }
}

// GET /api/exams/report-cards?studentId=&examId=
export async function GET(req: NextRequest) {
  const auth = decodeUser(req);
  if (!auth) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const examId = searchParams.get("examId") ?? "demo";

  try {
    const student = await prisma.student.findFirst({
      where: { userId: auth.userId },
      include: {
        user: { include: { profile: true } },
        gradeLevel: true,
        section: true,
        school: true,
      },
    });

    const studentName = student?.user.profile
      ? `${student.user.profile.firstName} ${student.user.profile.lastName}`
      : auth.name;
    const schoolName = student?.school.name ?? "AISchool";
    const gradeName = student?.gradeLevel.name ?? "Grade";
    const sectionName = student?.section.name ?? "A";
    const admissionNo = student?.admissionNo ?? "—";

    // Fetch result (or use demo data)
    const result = examId !== "demo"
      ? await prisma.examResult.findUnique({
          where: { id: examId },
          include: { examSchedule: true, marksEntries: { include: { subject: true } } },
        })
      : null;

    const subjects = result?.marksEntries?.map((m) => ({
      subject: m.subject?.name ?? "Subject",
      obtained: m.marksObtained ?? 0,
      max: m.maxMarks ?? 100,
      grade: m.grade ?? "B",
    })) ?? [
      { subject: "Mathematics", obtained: 88, max: 100, grade: "A1" },
      { subject: "Science", obtained: 76, max: 100, grade: "B1" },
      { subject: "English", obtained: 92, max: 100, grade: "A1" },
      { subject: "Social Studies", obtained: 74, max: 100, grade: "B1" },
      { subject: "Hindi", obtained: 85, max: 100, grade: "A2" },
    ];

    const examName = result?.examSchedule?.name ?? "Unit Test 1 — 2024-25";
    const totalObtained = subjects.reduce((s, sub) => s + sub.obtained, 0);
    const totalMax = subjects.reduce((s, sub) => s + sub.max, 0);
    const pct = Math.round((totalObtained / totalMax) * 100);

    // Generate PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve) => {
      doc.on("end", resolve);

      // Header
      doc.fontSize(20).font("Helvetica-Bold").text(schoolName, { align: "center" });
      doc.fontSize(14).font("Helvetica").text("Report Card", { align: "center" });
      doc.fontSize(11).text(`Academic Year: 2024-25`, { align: "center" });
      doc.moveDown(0.5);

      // Divider
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // Student info grid
      doc.fontSize(11).font("Helvetica-Bold").text("Student Name: ", { continued: true }).font("Helvetica").text(studentName);
      doc.font("Helvetica-Bold").text("Admission No: ", { continued: true }).font("Helvetica").text(admissionNo);
      doc.font("Helvetica-Bold").text("Class: ", { continued: true }).font("Helvetica").text(`${gradeName} — Section ${sectionName}`);
      doc.font("Helvetica-Bold").text("Examination: ", { continued: true }).font("Helvetica").text(examName);
      doc.moveDown(0.5);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // Marks table header
      const col = { sub: 50, obtained: 280, max: 370, grade: 450 };
      doc.fontSize(11).font("Helvetica-Bold");
      doc.text("Subject", col.sub, doc.y, { width: 220 });
      const hy = doc.y - 13;
      doc.text("Obtained", col.obtained, hy, { width: 80 });
      doc.text("Max", col.max, hy, { width: 70 });
      doc.text("Grade", col.grade, hy, { width: 80 });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);

      // Subject rows
      doc.font("Helvetica").fontSize(11);
      for (const sub of subjects) {
        const ry = doc.y;
        doc.text(sub.subject, col.sub, ry, { width: 220 });
        doc.text(String(sub.obtained), col.obtained, ry, { width: 80 });
        doc.text(String(sub.max), col.max, ry, { width: 70 });
        doc.text(sub.grade, col.grade, ry, { width: 80 });
        doc.moveDown(0.5);
      }

      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // Total row
      doc.font("Helvetica-Bold");
      doc.text("Total", col.sub, doc.y, { width: 220 });
      const ty = doc.y - 13;
      doc.text(`${totalObtained}`, col.obtained, ty, { width: 80 });
      doc.text(`${totalMax}`, col.max, ty, { width: 70 });
      doc.text(`${pct}%`, col.grade, ty, { width: 80 });
      doc.moveDown(1);

      // Result
      const passText = pct >= 35 ? "PASS" : "FAIL";
      doc.fontSize(13).text(`Result: ${passText}   Overall Percentage: ${pct}%`, { align: "center" });
      doc.moveDown(2);

      // Signatures
      doc.fontSize(11).font("Helvetica");
      doc.text("Class Teacher's Signature", 50, doc.y, { width: 200 });
      doc.text("Principal's Signature", 340, doc.y - 13, { width: 200 });
      doc.moveDown(2);
      doc.fontSize(9).fillColor("grey").text(`Generated on ${new Date().toLocaleDateString()}`, { align: "center" });

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-card-${examId}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error("[exams/report-cards]", err);
    return new NextResponse("Failed to generate report card", { status: 500 });
  }
}
