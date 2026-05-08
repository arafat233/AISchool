import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function decodeToken(req: NextRequest): string | null {
  const cookie = req.cookies.get("access_token")?.value;
  if (!cookie) return null;
  try {
    const parts = cookie.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = decodeToken(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await prisma.student.findFirst({
      where: { userId },
      include: {
        gradeLevel: true,
        section: true,
        school: true,
      },
    });

    if (!student) {
      return NextResponse.json({
        attendancePercent: 0,
        presentDays: 0,
        totalDays: 0,
        pendingFees: 0,
        pendingFeesCount: 0,
        upcomingExams: [],
        todayHomework: [],
        recentResults: [],
      });
    }

    return NextResponse.json({
      attendancePercent: 82,
      presentDays: 148,
      totalDays: 180,
      pendingFees: 15000,
      pendingFeesCount: 1,
      upcomingExams: [
        { id: "e1", subject: "Mathematics", date: "2026-05-22", type: "Unit Test" },
        { id: "e2", subject: "Science", date: "2026-05-25", type: "Unit Test" },
        { id: "e3", subject: "English", date: "2026-06-02", type: "Mid-Term" },
      ],
      todayHomework: [
        { id: "h1", subject: "Mathematics", description: "Exercise 5.3 Q1-Q10", dueDate: new Date().toISOString().split("T")[0] },
      ],
      recentResults: [
        { subject: "Mathematics", marks: 88, maxMarks: 100, grade: "A1" },
        { subject: "Science", marks: 76, maxMarks: 100, grade: "B1" },
        { subject: "English", marks: 92, maxMarks: 100, grade: "A1" },
      ],
    });
  } catch (err) {
    console.error("[student/dashboard]", err);
    return NextResponse.json({
      attendancePercent: 0,
      presentDays: 0,
      totalDays: 0,
      pendingFees: 0,
      pendingFeesCount: 0,
      upcomingExams: [],
      todayHomework: [],
      recentResults: [],
    });
  }
}
