import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";

import { AppModule } from "../src/app.module";

// ── Auth mock (JWT bypass) ───────────────────────────────────────────────────

const mockUser = {
  id: "user-001",
  role: "ACCOUNTANT",
  schoolId: "school-001",
  tenantId: "tenant-001",
};

jest.mock("@nestjs/passport", () => ({
  AuthGuard: () => {
    const { Injectable, CanActivate } = require("@nestjs/common");
    @Injectable()
    class MockJwtGuard implements CanActivate {
      canActivate(context: any) {
        const req = context.switchToHttp().getRequest();
        req.user = mockUser;
        return true;
      }
    }
    return MockJwtGuard;
  },
}));

// ── Prisma mock ──────────────────────────────────────────────────────────────

const mockFeeHead = {
  id: "head-001",
  schoolId: "school-001",
  name: "Tuition Fee",
  description: "Monthly tuition",
  isOptional: false,
  createdAt: new Date(),
};

const mockInvoice = {
  id: "invoice-001",
  schoolId: "school-001",
  studentId: "student-001",
  totalAmount: 5000,
  paidAmount: 0,
  dueDate: new Date(Date.now() + 86400000 * 30),
  status: "UNPAID",
  createdAt: new Date(),
  items: [],
};

jest.mock("@school-erp/database", () => ({
  PrismaModule: { module: class {} },
  PrismaService: jest.fn().mockImplementation(() => ({
    feeHead: {
      create: jest.fn().mockResolvedValue(mockFeeHead),
      findMany: jest.fn().mockResolvedValue([mockFeeHead]),
    },
    feeStructure: {
      create: jest.fn().mockResolvedValue({ id: "struct-001", ...mockFeeHead }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    feeInvoice: {
      create: jest.fn().mockResolvedValue(mockInvoice),
      findMany: jest.fn().mockResolvedValue([mockInvoice]),
      findFirst: jest.fn().mockResolvedValue(mockInvoice),
      findUnique: jest.fn().mockResolvedValue(mockInvoice),
      update: jest.fn().mockResolvedValue({ ...mockInvoice, paidAmount: 5000, status: "PAID" }),
      count: jest.fn().mockResolvedValue(1),
    },
    feePayment: {
      create: jest.fn().mockResolvedValue({ id: "pay-001", amount: 5000, method: "CASH" }),
    },
    student: {
      findMany: jest.fn().mockResolvedValue([{ id: "student-001" }]),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

// ── Test suite ───────────────────────────────────────────────────────────────

describe("FeeController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── GET /fees/health ────────────────────────────────────────────────────

  describe("GET /fees/health", () => {
    it("returns service health status", async () => {
      const res = await request(app.getHttpServer())
        .get("/fees/health")
        .expect(200);

      expect(res.body).toMatchObject({ status: "ok", service: "fee-service" });
    });
  });

  // ── POST /fees/heads ────────────────────────────────────────────────────

  describe("POST /fees/heads", () => {
    it("creates a fee head and returns it", async () => {
      const res = await request(app.getHttpServer())
        .post("/fees/heads")
        .set("Authorization", "Bearer mock-token")
        .send({ name: "Tuition Fee", description: "Monthly tuition", isOptional: false })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.name).toBe("Tuition Fee");
    });
  });

  // ── GET /fees/heads ─────────────────────────────────────────────────────

  describe("GET /fees/heads", () => {
    it("returns all fee heads for the school", async () => {
      const res = await request(app.getHttpServer())
        .get("/fees/heads")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── GET /fees/invoices/student/:studentId ───────────────────────────────

  describe("GET /fees/invoices/student/:studentId", () => {
    it("returns invoices for a student", async () => {
      const res = await request(app.getHttpServer())
        .get("/fees/invoices/student/student-001")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── POST /fees/invoices/:id/pay-cash ────────────────────────────────────

  describe("POST /fees/invoices/:id/pay-cash", () => {
    it("records a cash payment", async () => {
      const res = await request(app.getHttpServer())
        .post("/fees/invoices/invoice-001/pay-cash")
        .set("Authorization", "Bearer mock-token")
        .send({ amount: 5000, method: "CASH", receivedById: "user-001" })
        .expect(201);

      expect(res.body).toHaveProperty("id");
    });
  });
});
