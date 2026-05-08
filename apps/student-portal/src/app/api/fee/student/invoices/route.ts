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

    const invoices = await prisma.feeInvoice.findMany({
      where: { studentId: student.id },
      include: {
        payments: true,
        feeStructure: {
          include: { feeHead: true, term: true },
        },
      },
      orderBy: { dueDate: "desc" },
    });

    const result = invoices.map((inv) => {
      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      return {
        id: inv.id,
        title: inv.feeStructure?.feeHead?.name ?? "School Fee",
        dueDate: inv.dueDate,
        amount: inv.amount,
        paidAmount: paid,
        status: inv.status,
        items: inv.feeStructure ? [{
          label: inv.feeStructure.feeHead?.name ?? "Fee",
          amount: inv.amount,
        }] : [],
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[fee/student/invoices]", err);
    return NextResponse.json([]);
  }
}
