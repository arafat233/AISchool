import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import * as cookieParser from "cookie-parser";

import { AppModule } from "../src/app.module";

// ── Prisma mock ──────────────────────────────────────────────────────────────

const mockUser = {
  id: "user-001",
  email: "admin@school.test",
  passwordHash: "$2b$10$mocked.hash.for.testing.purposes.only.x",
  role: "SCHOOL_ADMIN",
  isActive: true,
  tenantId: "tenant-001",
  twoFactor: null,
};

jest.mock("@school-erp/database", () => ({
  PrismaModule: {
    module: class {},
    forRoot: () => ({ module: class {} }),
  },
  PrismaService: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn().mockResolvedValue(mockUser),
      findFirst: jest.fn().mockResolvedValue(mockUser),
      create: jest.fn().mockResolvedValue({ ...mockUser, id: "user-002" }),
      update: jest.fn().mockResolvedValue(mockUser),
    },
    school: {
      findFirst: jest.fn().mockResolvedValue({ id: "school-001" }),
    },
    tenant: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "tenant-001", status: "ACTIVE" }),
    },
    twoFactorAuth: {
      upsert: jest.fn().mockResolvedValue({}),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ token: "mock-refresh-token" }),
      findFirst: jest.fn().mockResolvedValue({ token: "mock-refresh-token", userId: "user-001", isRevoked: false, expiresAt: new Date(Date.now() + 86400000) }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    passwordResetToken: {
      create: jest.fn().mockResolvedValue({ token: "reset-token" }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

jest.mock("ioredis", () =>
  jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue("OK"),
  }))
);

jest.mock("bcrypt", () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue("$2b$10$mocked"),
  genSalt: jest.fn().mockResolvedValue("salt"),
}));

// ── Test suite ───────────────────────────────────────────────────────────────

describe("AuthController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /auth/login ────────────────────────────────────────────────────

  describe("POST /auth/login", () => {
    it("returns 200 + accessToken for valid credentials", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "admin@school.test", password: "Password123!" })
        .expect(200);

      expect(res.body).toHaveProperty("accessToken");
      expect(typeof res.body.accessToken).toBe("string");
    });

    it("returns 400 for missing email", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ password: "Password123!" })
        .expect(400);
    });

    it("returns 400 for missing password", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "admin@school.test" })
        .expect(400);
    });

    it("returns 401 for wrong password", async () => {
      const bcrypt = require("bcrypt");
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "admin@school.test", password: "WrongPassword!" })
        .expect(401);
    });

    it("returns 401 for inactive account", async () => {
      const { PrismaService } = require("@school-erp/database");
      const prismaInstance = new PrismaService();
      prismaInstance.user.findUnique.mockResolvedValueOnce({ ...mockUser, isActive: false });

      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "admin@school.test", password: "Password123!" })
        .expect(401);
    });
  });

  // ── POST /auth/register ─────────────────────────────────────────────────

  describe("POST /auth/register", () => {
    it("returns 201 for valid registration", async () => {
      const { PrismaService } = require("@school-erp/database");
      const prismaInstance = new PrismaService();
      prismaInstance.user.findUnique.mockResolvedValueOnce(null); // no existing user
      prismaInstance.tenant.findUniqueOrThrow.mockResolvedValueOnce({ id: "tenant-001", status: "ACTIVE" });

      const res = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "newuser@school.test",
          password: "NewPassword123!",
          firstName: "Jane",
          lastName: "Doe",
          role: "STUDENT",
          tenantId: "tenant-001",
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
    });

    it("returns 400 for invalid email format", async () => {
      await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email: "not-an-email", password: "Password123!", firstName: "Jane", lastName: "Doe" })
        .expect(400);
    });
  });

  // ── POST /auth/forgot-password ──────────────────────────────────────────

  describe("POST /auth/forgot-password", () => {
    it("returns 200 regardless of whether email exists (prevents enumeration)", async () => {
      await request(app.getHttpServer())
        .post("/auth/forgot-password")
        .send({ email: "anyone@school.test" })
        .expect(200);
    });
  });

  // ── GET /health ─────────────────────────────────────────────────────────

  describe("GET /health", () => {
    it("returns 200 health status", async () => {
      const res = await request(app.getHttpServer()).get("/health").expect(200);
      expect(res.body).toMatchObject({ status: expect.any(String) });
    });
  });
});
