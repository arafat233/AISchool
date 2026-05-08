import { NextResponse } from "next/server";

// Razorpay integration requires live keys - return a placeholder for dev
export async function POST() {
  return NextResponse.json(
    { error: "Payment gateway not configured for development. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
    { status: 503 }
  );
}
