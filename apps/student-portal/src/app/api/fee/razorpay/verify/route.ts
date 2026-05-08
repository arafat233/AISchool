import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Payment gateway not configured for development." },
    { status: 503 }
  );
}
