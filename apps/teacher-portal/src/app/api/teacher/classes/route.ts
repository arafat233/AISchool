import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function decodeUserId(req: NextRequest): string | null {
  const token = req.cookies.get("access_token")?.value;
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const p = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    return p.sub ?? null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const userId = decodeUserId(req);
  if (!userId) return NextResponse.json([], { status: 401 });

  try {
    const staff = await prisma.staff.findFirst({ where: { userId } });
    if (!staff) return NextResponse.json([]);

    const assignments = await prisma.classTeacher.findMany({
      where: { staffId: staff.id, isActive: true },
      include: {
        section: {
          include: {
            gradeLevel: true,
            students: { where: { status: "ACTIVE" } },
          },
        },
      },
    });

    // Also fetch subject teacher assignments
    const subjectTeachings = await prisma.teacherSubject.findMany({
      where: { staffId: staff.id },
      include: {
        subject: true,
        gradeLevel: true,
      },
    });

    // Class teacher sections
    const classTeacherSections = assignments.map((a) => ({
      id: `ct-${a.section.id}`,
      subject: "Class Teacher",
      subjectCode: "CT",
      class: a.section.gradeLevel.name,
      section: a.section.name,
      sectionId: a.section.id,
      studentCount: a.section.students.length,
      periodsPerWeek: 0,
      isClassTeacher: true,
    }));

    // Subject teacher assignments
    const subjectClasses = subjectTeachings.map((st) => ({
      id: `st-${st.id}`,
      subject: st.subject.name,
      subjectCode: st.subject.code,
      class: st.gradeLevel.name,
      section: "—",
      sectionId: "",
      studentCount: 0,
      periodsPerWeek: st.periodsPerWeek ?? 5,
      isClassTeacher: false,
    }));

    return NextResponse.json([...classTeacherSections, ...subjectClasses]);
  } catch (err) {
    console.error("[teacher/classes]", err);
    return NextResponse.json([]);
  }
}
