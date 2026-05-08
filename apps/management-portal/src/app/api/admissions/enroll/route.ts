import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/admissions/enroll?schoolId=X — returns grade levels and sections for that school
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ gradeLevels: [] });

  try {
    const gradeLevels = await prisma.gradeLevel.findMany({
      where: { schoolId, isActive: true },
      include: { sections: { where: { isActive: true }, select: { id: true, name: true } } },
      orderBy: { numericLevel: "asc" },
    });
    return NextResponse.json({ gradeLevels });
  } catch (err) {
    console.error("[admissions/enroll GET]", err);
    return NextResponse.json({ gradeLevels: [] });
  }
}

// POST /api/admissions/enroll — create user + student record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, schoolId, gradeLevelId, sectionId, dob } = body;

    if (!firstName || !lastName || !email || !schoolId || !gradeLevelId || !sectionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    // Get school to find tenantId
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    // Generate admission number
    const count = await prisma.student.count({ where: { schoolId } });
    const admissionNo = `${school.code}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: "$2b$10$placeholder_hash_change_on_first_login",
          role: "STUDENT",
          tenantId: school.tenantId,
          schoolId,
          profile: {
            create: {
              firstName,
              lastName,
              phone: phone ?? null,
              dateOfBirth: dob ? new Date(dob) : null,
            },
          },
        },
      });

      return tx.student.create({
        data: {
          schoolId,
          userId: user.id,
          admissionNo,
          gradeLevelId,
          sectionId,
          status: "ACTIVE",
        },
      });
    });

    return NextResponse.json({ success: true, admissionNo: student.admissionNo, studentId: student.id }, { status: 201 });
  } catch (err) {
    console.error("[admissions/enroll POST]", err);
    return NextResponse.json({ error: "Enrollment failed" }, { status: 500 });
  }
}
