import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ totalRevenueMtd: 0, totalPendingFees: 0 });
}
