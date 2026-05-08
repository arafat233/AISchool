import { Injectable, InternalServerErrorException } from "@nestjs/common";
import Razorpay from "razorpay";
import { createHmac } from "crypto";

@Injectable()
export class RazorpayService {
  private readonly rz: Razorpay;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
    }
    this.rz = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createOrder(amountInPaise: number, currency = "INR", receipt: string) {
    try {
      return await this.rz.orders.create({ amount: amountInPaise, currency, receipt });
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Razorpay order creation failed: ${err?.error?.description ?? err?.message ?? "unknown error"}`,
      );
    }
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    const body = `${orderId}|${paymentId}`;
    const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");
    return expected === signature;
  }
}
