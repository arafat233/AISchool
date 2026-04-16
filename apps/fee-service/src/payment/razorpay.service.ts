import { Injectable } from "@nestjs/common";
import Razorpay from "razorpay";
import { createHmac } from "crypto";

@Injectable()
export class RazorpayService {
  private readonly rz: Razorpay;

  constructor() {
    this.rz = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "",
    });
  }

  async createOrder(amountInPaise: number, currency = "INR", receipt: string) {
    return this.rz.orders.create({ amount: amountInPaise, currency, receipt });
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    const body = `${orderId}|${paymentId}`;
    const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(body)
      .digest("hex");
    return expected === signature;
  }
}
