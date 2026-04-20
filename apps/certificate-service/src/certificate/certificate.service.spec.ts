import { Test, TestingModule } from "@nestjs/testing";
import { CertificateService } from "./certificate.service";

jest.mock("qrcode", () => ({ toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,fake") }));

const mockPrisma = {
  certificateTemplate: { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  certificateRequest: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  certificate: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
  student: { findUnique: jest.fn() },
  staff: { findUnique: jest.fn() },
};

describe("CertificateService", () => {
  let service: CertificateService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CertificateService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<CertificateService>(CertificateService);
  });

  describe("createTemplate", () => {
    it("should create template with isActive=true", async () => {
      mockPrisma.certificateTemplate.create.mockResolvedValueOnce({ id: "tmpl-1", isActive: true });
      const result = await service.createTemplate("sch-1", {
        name: "TC Template", certificateType: "TRANSFER",
        htmlTemplate: "<p>{{studentName}}</p>", fieldMap: ["studentName"],
      });
      expect(result.isActive).toBe(true);
    });
  });

  describe("createRequest", () => {
    it("should create request with 2-day SLA deadline", async () => {
      mockPrisma.certificateRequest.create.mockResolvedValueOnce({ id: "req-1" });
      await service.createRequest({
        schoolId: "sch-1", requestedBy: "parent-1",
        studentId: "stu-1", certificateType: "BONAFIDE",
      });
      const createCall = mockPrisma.certificateRequest.create.mock.calls[0][0];
      const slaDeadline = createCall.data.slaDeadline as Date;
      const diff = slaDeadline.getTime() - Date.now();
      expect(diff).toBeGreaterThan(1 * 86400000); // > 1 day
      expect(diff).toBeLessThan(3 * 86400000);    // < 3 days
    });
  });

  describe("getTemplates", () => {
    it("should filter by certificate type when provided", async () => {
      mockPrisma.certificateTemplate.findMany.mockResolvedValueOnce([]);
      await service.getTemplates("sch-1", "TRANSFER");
      expect(mockPrisma.certificateTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ certificateType: "TRANSFER" }),
        })
      );
    });
  });
});
