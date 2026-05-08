import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function decodeUserId(req: NextRequest): string | null {
  const token = req.cookies.get("access_token")?.value;
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    return payload.sub ?? null;
  } catch {
    return null;
  }
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
          include: { gradeLevel: true },
        },
      },
    });

    const sections = assignments.map((a) => ({
      id: a.section.id,
      name: a.section.name,
      gradeLevel: { name: a.section.gradeLevel.name },
    }));

    return NextResponse.json(sections);
  } catch (err) {
    console.error("[teacher/sections]", err);
    return NextResponse.json([]);
  }
}
