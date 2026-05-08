import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const [totalSchools, totalStudents] = await Promise.all([
      prisma.school.count({ where: { isActive: true } }),
      prisma.student.count({ where: { status: "ACTIVE" } }),
    ]);

    return NextResponse.json({
      totalSchools,
      totalStudents,
      attendanceAvgPct: 0,
      activeAdmissions: 0,
    });
  } catch (err) {
    console.error("[tenants/summary]", err);
    return NextResponse.json({ totalSchools: 0, totalStudents: 0, attendanceAvgPct: 0, activeAdmissions: 0 });
  }
}
