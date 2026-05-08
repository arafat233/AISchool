import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId");

  if (!sectionId) {
    return NextResponse.json({ data: [] });
  }

  try {
    const students = await prisma.student.findMany({
      where: { sectionId, status: "ACTIVE" },
      include: {
        user: {
          include: { profile: true },
        },
      },
      orderBy: { rollNo: "asc" },
    });

    const data = students.map((s) => ({
      id: s.id,
      admissionNo: s.admissionNo,
      rollNo: s.rollNo,
      user: {
        firstName: s.user.profile?.firstName ?? s.user.email.split("@")[0],
        lastName: s.user.profile?.lastName ?? "",
      },
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[student/list]", err);
    return NextResponse.json({ data: [] });
  }
}
