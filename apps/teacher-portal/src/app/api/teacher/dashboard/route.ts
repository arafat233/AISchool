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
    const staff = await prisma.staff.findFirst({ where: { userId } });

    if (!staff) {
      return NextResponse.json({
        totalClasses: 0,
        classesToday: 0,
        pendingAttendance: 0,
        leaveStatus: null,
        substituteAlerts: 0,
        upcomingPeriods: [],
        pendingTasks: [],
      });
    }

    const classTeacherAssignments = await prisma.classTeacher.findMany({
      where: { staffId: staff.id, isActive: true },
      include: {
        section: {
          include: { gradeLevel: true },
        },
      },
    });

    const totalClasses = classTeacherAssignments.length;

    const upcomingPeriods = classTeacherAssignments.slice(0, 4).map((ct, i) => ({
      time: `${8 + i}:00 AM`,
      subject: "Mathematics",
      class: ct.section.gradeLevel.name,
      section: ct.section.name,
    }));

    const pendingTasks = classTeacherAssignments.slice(0, 3).map((ct) => ({
      id: ct.id,
      label: `Mark attendance — ${ct.section.gradeLevel.name}${ct.section.name}`,
      href: "/attendance",
      urgent: true,
    }));

    return NextResponse.json({
      totalClasses,
      classesToday: Math.min(totalClasses, 4),
      pendingAttendance: totalClasses,
      leaveStatus: null,
      substituteAlerts: 0,
      upcomingPeriods,
      pendingTasks,
    });
  } catch (err) {
    console.error("[teacher/dashboard]", err);
    return NextResponse.json({
      totalClasses: 0,
      classesToday: 0,
      pendingAttendance: 0,
      leaveStatus: null,
      substituteAlerts: 0,
      upcomingPeriods: [],
      pendingTasks: [],
    });
  }
}
