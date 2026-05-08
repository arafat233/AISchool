import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) return NextResponse.json({ students: [], staff: [], schools: [] });

  try {
    const [students, staff, schools] = await Promise.all([
      prisma.student.findMany({
        where: {
          OR: [
            { admissionNo: { contains: q, mode: "insensitive" } },
            { user: { profile: { firstName: { contains: q, mode: "insensitive" } } } },
            { user: { profile: { lastName: { contains: q, mode: "insensitive" } } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
          status: "ACTIVE",
        },
        include: {
          user: { include: { profile: true } },
          gradeLevel: true,
          section: true,
          school: true,
        },
        take: 8,
      }),
      prisma.staff.findMany({
        where: {
          OR: [
            { employeeCode: { contains: q, mode: "insensitive" } },
            { user: { profile: { firstName: { contains: q, mode: "insensitive" } } } },
            { user: { profile: { lastName: { contains: q, mode: "insensitive" } } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        },
        include: {
          user: { include: { profile: true } },
          school: true,
        },
        take: 5,
      }),
      prisma.school.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
          isActive: true,
        },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      students: students.map((s) => ({
        id: s.id,
        name: s.user.profile ? `${s.user.profile.firstName} ${s.user.profile.lastName}` : s.user.email,
        admissionNo: s.admissionNo,
        class: `${s.gradeLevel.name}-${s.section.name}`,
        school: s.school.name,
        type: "student",
      })),
      staff: staff.map((st) => ({
        id: st.id,
        name: st.user.profile ? `${st.user.profile.firstName} ${st.user.profile.lastName}` : st.user.email,
        employeeCode: st.employeeCode,
        school: st.school?.name,
        type: "staff",
      })),
      schools: schools.map((sc) => ({
        id: sc.id,
        name: sc.name,
        code: sc.code,
        city: sc.city,
        type: "school",
      })),
    });
  } catch (err) {
    console.error("[search]", err);
    return NextResponse.json({ students: [], staff: [], schools: [] });
  }
}
