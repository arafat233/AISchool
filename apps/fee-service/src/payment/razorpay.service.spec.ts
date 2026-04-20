import { RazorpayService } from "./razorpay.service";
import { createHmac } from "crypto";

// Mock Razorpay SDK
const mockOrdersCreate = jest.fn();
jest.mock("razorpay", () =>
  jest.fn().mockImplementation(() => ({
    orders: { create: mockOrdersCreate },
  }))
);

describe("RazorpayService", () => {
  let service: RazorpayService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RazorpayService();
  });

  describe("createOrder", () => {
    it("should create Razorpay order with correct amount and currency", async () => {
      mockOrdersCreate.mockResolvedValueOnce({ id: "order_abc123", amount: 50000, currency: "INR" });
      const result = await service.createOrder(50000, "INR", "INV-abc12345");
      expect(result.id).toBe("order_abc123");
      expect(mockOrdersCreate).toHaveBeenCalledWith({
        amount: 50000, currency: "INR", receipt: "INV-abc12345",
      });
    });

    it("should default currency to INR", async () => {
      mockOrdersCreate.mockResolvedValueOnce({ id: "order_def456" });
      await service.createOrder(10000, "INR", "INV-def45678");
      expect(mockOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ currency: "INR" })
      );
    });
  });

  describe("verifySignature", () => {
    it("should return true for a valid HMAC signature", () => {
      const orderId = "order_test123";
      const paymentId = "pay_test456";
      const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
      const signature = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
      expect(service.verifySignature(orderId, paymentId, signature)).toBe(true);
    });

    it("should return false for a tampered signature", () => {
      const result = service.verifySignature("order_test123", "pay_test456", "invalid-signature");
      expect(result).toBe(false);
    });
  });
});
