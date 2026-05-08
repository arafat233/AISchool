import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { students: true, staff: true } },
      },
      orderBy: { name: "asc" },
    });

    const result = schools.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      city: s.city,
      state: s.state,
      subscriptionPlan: "ENTERPRISE",
      subscriptionStatus: "ACTIVE",
      studentCount: s._count.students,
      staffCount: s._count.staff,
      healthScore: 95,
      createdAt: s.createdAt,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[tenants]", err);
    return NextResponse.json([]);
  }
}
