import { Test, TestingModule } from "@nestjs/testing";
import { NotificationService } from "./notification.service";

const mockEmailQueue = { add: jest.fn().mockResolvedValue({ id: "job-email-1" }) };
const mockSmsQueue = { add: jest.fn().mockResolvedValue({ id: "job-sms-1" }) };
const mockPushQueue = { add: jest.fn().mockResolvedValue({ id: "job-push-1" }) };

jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation((name: string) => {
    if (name === "email") return mockEmailQueue;
    if (name === "sms") return mockSmsQueue;
    return mockPushQueue;
  }),
}));

jest.mock("@school-erp/events", () => ({
  QUEUES: { EMAIL: "email", SMS: "sms", PUSH: "push" },
  DEFAULT_JOB_OPTIONS: { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
}));

const mockPrisma = {
  notificationTemplate: { create: jest.fn(), findMany: jest.fn() },
  notification: { findMany: jest.fn(), updateMany: jest.fn() },
};

describe("NotificationService", () => {
  let service: NotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<NotificationService>(NotificationService);
  });

  describe("sendEmail", () => {
    it("should enqueue email job", async () => {
      const result = await service.sendEmail("test@school.edu", "Welcome!", "<h1>Hello</h1>");
      expect(result.id).toBe("job-email-1");
      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        "send-email",
        { to: "test@school.edu", subject: "Welcome!", html: "<h1>Hello</h1>" },
        expect.any(Object)
      );
    });
  });

  describe("sendSms", () => {
    it("should enqueue SMS job", async () => {
      const result = await service.sendSms("+919876543210", "Your OTP is 123456");
      expect(result.id).toBe("job-sms-1");
      expect(mockSmsQueue.add).toHaveBeenCalledWith(
        "send-sms",
        { to: "+919876543210", message: "Your OTP is 123456" },
        expect.any(Object)
      );
    });
  });

  describe("sendPush", () => {
    it("should enqueue push notification job with optional data", async () => {
      await service.sendPush("fcm-token-123", "Fee Due", "Your fee is due", { amount: "5000" });
      expect(mockPushQueue.add).toHaveBeenCalledWith(
        "send-push",
        { token: "fcm-token-123", title: "Fee Due", body: "Your fee is due", data: { amount: "5000" } },
        expect.any(Object)
      );
    });
  });

  describe("createTemplate", () => {
    it("should create notification template", async () => {
      mockPrisma.notificationTemplate.create.mockResolvedValueOnce({ id: "tmpl-1", name: "Fee Reminder" });
      const result = await service.createTemplate("t-1", {
        name: "Fee Reminder", channel: "EMAIL",
        subject: "Fee Due", body: "Dear parent, your fee is due.",
      });
      expect(result.id).toBe("tmpl-1");
    });
  });

  describe("markRead", () => {
    it("should update notification as read with readAt timestamp", async () => {
      mockPrisma.notification.updateMany.mockResolvedValueOnce({ count: 1 });
      await service.markRead("notif-1", "user-1");
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isRead: true }) })
      );
    });
  });
});
