import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";

import { AppModule } from "../src/app.module";

// ── Auth mock (JWT bypass) ───────────────────────────────────────────────────

const mockUser = {
  id: "user-001",
  email: "admin@school.test",
  role: "SCHOOL_ADMIN",
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

const mockStudent = {
  id: "student-001",
  schoolId: "school-001",
  tenantId: "tenant-001",
  userId: "user-010",
  admissionNo: "ADM-2024-001",
  rollNo: "R001",
  firstName: "Aisha",
  lastName: "Khan",
  dateOfBirth: new Date("2010-06-15"),
  gender: "FEMALE",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

jest.mock("@school-erp/database", () => ({
  PrismaModule: { module: class {} },
  PrismaService: jest.fn().mockImplementation(() => ({
    student: {
      create: jest.fn().mockResolvedValue(mockStudent),
      findMany: jest.fn().mockResolvedValue([mockStudent]),
      findFirst: jest.fn().mockResolvedValue(mockStudent),
      findUnique: jest.fn().mockResolvedValue(mockStudent),
      update: jest.fn().mockResolvedValue(mockStudent),
      count: jest.fn().mockResolvedValue(1),
    },
    user: {
      create: jest.fn().mockResolvedValue({ id: "user-010" }),
    },
    studentBadge: { findMany: jest.fn().mockResolvedValue([]) },
    studentPoints: { findFirst: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    iepPlan: { findFirst: jest.fn().mockResolvedValue(null) },
    mentorAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

// ── Test suite ───────────────────────────────────────────────────────────────

describe("StudentController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── GET /students ───────────────────────────────────────────────────────

  describe("GET /students", () => {
    it("returns paginated student list", async () => {
      const res = await request(app.getHttpServer())
        .get("/students")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(Array.isArray(res.body) || res.body.data).toBeTruthy();
    });
  });

  // ── POST /students ──────────────────────────────────────────────────────

  describe("POST /students", () => {
    it("creates a student and returns 201", async () => {
      const res = await request(app.getHttpServer())
        .post("/students")
        .set("Authorization", "Bearer mock-token")
        .send({
          firstName: "Aisha",
          lastName: "Khan",
          dateOfBirth: "2010-06-15",
          gender: "FEMALE",
          classId: "class-001",
          sectionId: "section-001",
          academicYearId: "ay-001",
          parentName: "Zara Khan",
          parentPhone: "9876543210",
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.firstName).toBe("Aisha");
    });

    it("returns 400 when required fields are missing", async () => {
      await request(app.getHttpServer())
        .post("/students")
        .set("Authorization", "Bearer mock-token")
        .send({ firstName: "Aisha" }) // missing required fields
        .expect(400);
    });
  });

  // ── GET /students/:id ───────────────────────────────────────────────────

  describe("GET /students/:id", () => {
    it("returns a student by id", async () => {
      const res = await request(app.getHttpServer())
        .get("/students/student-001")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body).toHaveProperty("id", "student-001");
    });

    it("returns 404 for unknown student", async () => {
      const { PrismaService } = require("@school-erp/database");
      const prismaInstance = new PrismaService();
      prismaInstance.student.findFirst.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get("/students/nonexistent")
        .set("Authorization", "Bearer mock-token")
        .expect(404);
    });
  });

  // ── PATCH /students/:id ─────────────────────────────────────────────────

  describe("PATCH /students/:id", () => {
    it("updates student fields", async () => {
      const res = await request(app.getHttpServer())
        .patch("/students/student-001")
        .set("Authorization", "Bearer mock-token")
        .send({ rollNo: "R099" })
        .expect(200);

      expect(res.body).toHaveProperty("id");
    });
  });
});
