/**
 * Unit tests for the API service module.
 * Validates endpoint URLs and parameter shapes without making real HTTP calls.
 */

// The axios mock returns a factory — capture the mock instance
import axios from "axios";
const mockedAxios = axios as jest.Mocked<typeof axios>;

let studentApi: typeof import("../services/api").studentApi;
let parentApi: typeof import("../services/api").parentApi;
let authApi: typeof import("../services/api").authApi;

// Mock api instance
const mockApiInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
};

beforeEach(async () => {
  jest.resetModules();
  mockedAxios.create.mockReturnValue(mockApiInstance as any);
  ({ studentApi, parentApi, authApi } = await import("../services/api"));
  jest.clearAllMocks();
  mockApiInstance.get.mockResolvedValue({ data: {} });
  mockApiInstance.post.mockResolvedValue({ data: {} });
});

describe("authApi", () => {
  it("login POSTs to /auth/login", async () => {
    await authApi.login("user@test.com", "pass123");
    expect(mockApiInstance.post).toHaveBeenCalledWith("/auth/login", { email: "user@test.com", password: "pass123" });
  });

  it("me GETs /auth/me", async () => {
    await authApi.me();
    expect(mockApiInstance.get).toHaveBeenCalledWith("/auth/me");
  });

  it("loginPhone POSTs to /auth/otp/send", async () => {
    await authApi.loginPhone("+919876543210");
    expect(mockApiInstance.post).toHaveBeenCalledWith("/auth/otp/send", { phone: "+919876543210" });
  });

  it("verifyOtp POSTs with phone and otp", async () => {
    await authApi.verifyOtp("+919876543210", "123456");
    expect(mockApiInstance.post).toHaveBeenCalledWith("/auth/otp/verify", { phone: "+919876543210", otp: "123456" });
  });
});

describe("studentApi", () => {
  it("dashboard GETs correct URL", async () => {
    await studentApi.dashboard("st1");
    expect(mockApiInstance.get).toHaveBeenCalledWith("/students/st1/dashboard");
  });

  it("attendance GETs with from/to params", async () => {
    await studentApi.attendance("st1", "2026-04-01", "2026-04-30");
    expect(mockApiInstance.get).toHaveBeenCalledWith(
      "/attendance/student/st1",
      expect.objectContaining({ params: { from: "2026-04-01", to: "2026-04-30" } }),
    );
  });

  it("feeInvoices GETs correct URL", async () => {
    await studentApi.feeInvoices("st1");
    expect(mockApiInstance.get).toHaveBeenCalledWith("/fees/invoices/student/st1");
  });

  it("submitAssignment POSTs with multipart header", async () => {
    const fd = new FormData();
    await studentApi.submitAssignment("a1", fd);
    expect(mockApiInstance.post).toHaveBeenCalledWith(
      "/lms/assignments/a1/submit",
      fd,
      expect.objectContaining({ headers: { "Content-Type": "multipart/form-data" } }),
    );
  });
});

describe("parentApi", () => {
  it("children GETs correct URL", async () => {
    await parentApi.children("p1");
    expect(mockApiInstance.get).toHaveBeenCalledWith("/students/parent/p1");
  });

  it("busLocation GETs correct URL", async () => {
    await parentApi.busLocation("v1");
    expect(mockApiInstance.get).toHaveBeenCalledWith("/transport/vehicle/v1/location");
  });

  it("topUpWallet POSTs correct payload", async () => {
    await parentApi.topUpWallet(500, "UPI");
    expect(mockApiInstance.post).toHaveBeenCalledWith("/fees/wallet/topup", { amount: 500, method: "UPI" });
  });
});
