import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function decodeUserId(req: NextRequest): { userId: string } | null {
  const token = req.cookies.get("access_token")?.value;
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = decodeUserId(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as {
      sectionId: string;
      date: string;
      records: { studentId: string; status: string }[];
    };

    const { sectionId, date, records } = body;

    // Find school for this section
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { gradeLevel: { include: { school: true } } },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const schoolId = section.gradeLevel.school.id;
    const sessionDate = new Date(date);

    // Find the staff record for this user to use as markedById
    const staff = await prisma.staff.findFirst({ where: { userId: auth.userId } });
    const markedById = staff?.id ?? auth.userId;

    // Upsert attendance session (unique on sectionId + date)
    const session = await prisma.attendanceSession.upsert({
      where: { sectionId_date: { sectionId, date: sessionDate } },
      update: { isFinalized: true, markedById },
      create: {
        schoolId,
        sectionId,
        date: sessionDate,
        markedById,
        isFinalized: true,
      },
    });

    // Bulk upsert attendance records
    await Promise.all(
      records.map((r) =>
        prisma.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId: r.studentId } },
          update: { status: r.status as never, editedBy: auth.userId, editedAt: new Date() },
          create: {
            sessionId: session.id,
            studentId: r.studentId,
            status: r.status as never,
          },
        })
      )
    );

    return NextResponse.json({ ok: true, sessionId: session.id, count: records.length });
  } catch (err) {
    console.error("[attendance/bulk]", err);
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}
