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
    const links = await prisma.studentParent.findMany({
      where: { userId },
      include: {
        student: {
          include: {
            user: { include: { profile: true } },
            gradeLevel: true,
            section: true,
          },
        },
      },
    });

    const children = links.map((l) => ({
      id: l.student.id,
      admissionNo: l.student.admissionNo,
      firstName: l.student.user.profile?.firstName ?? l.student.user.email.split("@")[0],
      lastName: l.student.user.profile?.lastName ?? "",
      className: l.student.gradeLevel.name,
      sectionName: l.student.section.name,
      photoUrl: undefined,
    }));

    return NextResponse.json(children);
  } catch (err) {
    console.error("[parent/children]", err);
    return NextResponse.json([]);
  }
}
