import { Test, TestingModule } from "@nestjs/testing";
import { SaasNotificationService } from "./saas-notification.service";

jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock("ioredis", () =>
  jest.fn().mockImplementation(() => ({ on: jest.fn() }))
);

describe("SaasNotificationService", () => {
  let service: SaasNotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [SaasNotificationService],
    }).compile();
    service = module.get<SaasNotificationService>(SaasNotificationService);
    await service.onModuleInit();
  });

  it("should enqueue GO_LIVE email with rendered subject", async () => {
    const queueAdd = (service as any).queue?.add;
    await service.send({
      to: "admin@school.in",
      tenantId: "t-1",
      eventType: "GO_LIVE",
      vars: { school_name: "Springfield School", contact_name: "Admin", plan: "BASIC", portal_url: "https://app.test" },
    });
    expect(queueAdd).toHaveBeenCalledWith(
      "GO_LIVE",
      expect.objectContaining({
        to: "admin@school.in",
        subject: expect.stringContaining("Springfield School"),
      }),
      expect.any(Object)
    );
  });

  it("should enqueue MONTHLY_INVOICE with amount in subject", async () => {
    const queueAdd = (service as any).queue?.add;
    await service.send({
      to: "billing@school.in",
      tenantId: "t-1",
      eventType: "MONTHLY_INVOICE",
      vars: {
        contact_name: "Admin",
        invoice_number: "INV-001",
        month_year: "May 2026",
        student_count: 200,
        plan: "STANDARD",
        base_amount: 20000,
        gst_amount: 3600,
        total_amount: 23600,
        due_date: "10/06/2026",
        billing_url: "https://app.test/billing",
      },
    });
    expect(queueAdd).toHaveBeenCalledWith(
      "MONTHLY_INVOICE",
      expect.objectContaining({ subject: expect.stringContaining("23600") }),
      expect.any(Object)
    );
  });

  it("should log instead of enqueue when queue is null", async () => {
    (service as any).queue = null;
    const logSpy = jest.spyOn((service as any).logger, "log").mockImplementation(() => {});
    await service.send({
      to: "x@y.com", tenantId: "t-1", eventType: "SUSPENSION_NOTICE",
      vars: { contact_name: "Admin", school_name: "School A", reason: "Test", billing_url: "https://test" },
    });
    expect(logSpy).toHaveBeenCalled();
  });

  it("should warn and return early for unknown event type", async () => {
    const warnSpy = jest.spyOn((service as any).logger, "warn").mockImplementation(() => {});
    await service.send({ to: "x@y.com", tenantId: "t-1", eventType: "UNKNOWN_EVENT" as any, vars: {} });
    expect(warnSpy).toHaveBeenCalled();
  });
});
