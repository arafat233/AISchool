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
    const student = await prisma.student.findFirst({ where: { userId } });
    if (!student) return NextResponse.json([]);

    const payments = await prisma.feePayment.findMany({
      where: { invoice: { studentId: student.id } },
      include: { invoice: { include: { feeStructure: { include: { feeHead: true } } } } },
      orderBy: { paidAt: "desc" },
    });

    const result = payments.map((p) => ({
      id: p.id,
      date: p.paidAt,
      amount: p.amount,
      mode: p.mode,
      reference: p.referenceNo,
      description: p.invoice?.feeStructure?.feeHead?.name ?? "Fee Payment",
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[fee/student/payments]", err);
    return NextResponse.json([]);
  }
}
