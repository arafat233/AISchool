import { Test, TestingModule } from "@nestjs/testing";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { AuthGuard } from "@nestjs/passport";

const mockUser = {
  id: "user-1",
  schoolId: "sch-1",
  tenantId: "tenant-1",
  role: "ADMIN",
  email: "admin@school.com",
};

function makeReq(user = mockUser) {
  return { user } as any;
}

describe("NotificationController", () => {
  let controller: NotificationController;
  let service: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    const mockService: jest.Mocked<NotificationService> = {
      getNotifications: jest.fn(),
      markRead: jest.fn(),
      createTemplate: jest.fn(),
      getTemplates: jest.fn(),
      sendEmail: jest.fn(),
      sendSms: jest.fn(),
      sendPush: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [{ provide: NotificationService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard("jwt"))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get(NotificationService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("health", () => {
    it("returns ok status", () => {
      expect(controller.health()).toEqual({ status: "ok", service: "notification-service" });
    });
  });

  describe("getMyNotifications", () => {
    it("calls service.getNotifications with user id from JWT", async () => {
      service.getNotifications.mockResolvedValueOnce([] as any);
      const res = await controller.getMyNotifications(makeReq());
      expect(service.getNotifications).toHaveBeenCalledWith("user-1");
      expect(res).toEqual([]);
    });
  });

  describe("markRead", () => {
    it("calls service.markRead with notification id and user id", async () => {
      service.markRead.mockResolvedValueOnce({ count: 1 } as any);
      await controller.markRead("notif-1", makeReq());
      expect(service.markRead).toHaveBeenCalledWith("notif-1", "user-1");
    });
  });

  describe("createTemplate", () => {
    it("calls service.createTemplate with tenantId from JWT and dto", async () => {
      const dto = { name: "Fee Reminder", channel: "EMAIL", subject: "Fee Due", body: "Dear parent..." } as any;
      service.createTemplate.mockResolvedValueOnce({ id: "tmpl-1" } as any);
      const res = await controller.createTemplate(makeReq(), dto);
      expect(service.createTemplate).toHaveBeenCalledWith("tenant-1", dto);
      expect(res).toEqual({ id: "tmpl-1" });
    });
  });

  describe("getTemplates", () => {
    it("calls service.getTemplates with tenantId from JWT", async () => {
      service.getTemplates.mockResolvedValueOnce([] as any);
      await controller.getTemplates(makeReq());
      expect(service.getTemplates).toHaveBeenCalledWith("tenant-1");
    });
  });

  describe("sendEmail", () => {
    it("calls service.sendEmail with to, subject, and html", async () => {
      service.sendEmail.mockResolvedValueOnce({ id: "job-1" } as any);
      const res = await controller.sendEmail({ to: "p@example.com", subject: "Hi", html: "<p>Hi</p>" });
      expect(service.sendEmail).toHaveBeenCalledWith("p@example.com", "Hi", "<p>Hi</p>");
      expect(res).toEqual({ id: "job-1" });
    });
  });

  describe("sendSms", () => {
    it("calls service.sendSms with to and message", async () => {
      service.sendSms.mockResolvedValueOnce({ id: "job-2" } as any);
      const res = await controller.sendSms({ to: "+919876543210", message: "Your OTP is 123456" });
      expect(service.sendSms).toHaveBeenCalledWith("+919876543210", "Your OTP is 123456");
      expect(res).toEqual({ id: "job-2" });
    });
  });
});
