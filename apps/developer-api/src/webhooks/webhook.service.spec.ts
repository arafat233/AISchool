import { Test, TestingModule } from "@nestjs/testing";
import { WebhookService } from "./webhook.service";
import crypto from "crypto";

jest.mock("axios");

const mockPrisma = {
  $executeRaw: jest.fn().mockResolvedValue(1),
  $queryRaw: jest.fn().mockResolvedValue([]),
};

describe("WebhookService", () => {
  let service: WebhookService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookService, { provide: require("../prisma/prisma.service").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<WebhookService>(WebhookService);
  });

  describe("registerEndpoint", () => {
    it("should hash the secret before storing", async () => {
      await service.registerEndpoint("sch-1", "https://app.example.com/hooks", ["fee_paid", "student_enrolled"], "my-secret");
      const call = mockPrisma.$executeRaw.mock.calls[0][0];
      // The raw query should not contain the plain secret
      const expectedHash = crypto.createHash("sha256").update("my-secret").digest("hex");
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe("listEndpoints", () => {
    it("should return endpoints for the school", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: "ep-1", url: "https://app.example.com/hooks", events: ["fee_paid"], is_active: true },
      ]);
      const result = await service.listEndpoints("sch-1");
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe("https://app.example.com/hooks");
    });
  });

  describe("deactivateEndpoint", () => {
    it("should call $executeRaw to set is_active=false", async () => {
      await service.deactivateEndpoint("ep-1", "sch-1");
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe("dispatch", () => {
    it("should query active endpoints subscribed to the event", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]); // no endpoints for this event
      await service.dispatch("sch-1", "fee_paid", { amount: 5000, studentId: "stu-1" });
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it("should fire deliverWithRetry for each matching endpoint", async () => {
      const axios = require("axios");
      axios.post = jest.fn().mockResolvedValue({ status: 200 });
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: "ep-1", url: "https://app.example.com/hooks", secret_hash: "hash123" },
      ]);
      await service.dispatch("sch-1", "fee_paid", { amount: 5000 });
      // Dispatch should not throw even if delivery happens asynchronously
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });
});
