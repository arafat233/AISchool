/**
 * Payroll Service — E2E Tests
 *
 * Tests HTTP contract (status codes + response shape) for the payroll endpoints.
 * Business logic is covered by unit tests in src/payroll/payroll.service.spec.ts.
 *
 * All database calls are intercepted by overriding PrismaService with a mock,
 * and the JWT auth guard is bypassed so no real tokens are required.
 */
import {
  Test, TestingModule,
} from '@nestjs/testing';
import {
  INestApplication, ValidationPipe,
  Catch, ExceptionFilter, ArgumentsHost, HttpException,
} from '@nestjs/common';
import * as request from 'supertest';
import { AuthGuard } from '@nestjs/passport';
import { AppModule } from '../src/app.module';

// ── AppError → HTTP filter ─────────────────────────────────────────────────
// The payroll-service doesn't register a global filter in main.ts,
// so we wire one up in the test to correctly translate AppError (ConflictError,
// NotFoundError etc.) into their declared HTTP status codes.

@Catch()
class AppErrorFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json(exception.getResponse());
    } else {
      const status: number = exception?.statusCode ?? 500;
      res.status(status).json({ code: exception?.code ?? 'INTERNAL_ERROR', message: exception?.message ?? 'Internal server error' });
    }
  }
}

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockPrismaService = {
  payrollRun: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'run-1',
      status: 'DRAFT',
      month: 4,
      year: 2026,
      schoolId: 'school-1',
      academicYearId: 'ay-1',
    }),
    update: jest.fn().mockResolvedValue({
      id: 'run-1',
      status: 'PROCESSING',
      month: 4,
      year: 2026,
      schoolId: 'school-1',
      payslips: [],
    }),
    findMany: jest.fn().mockResolvedValue([
      { id: 'run-1', status: 'DRAFT', month: 4, year: 2026, schoolId: 'school-1' },
    ]),
  },
  payslip: {
    findMany: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue({ id: 'ps-1', staffId: 'staff-1', grossSalary: 30000, netSalary: 26000 }),
    findUnique: jest.fn().mockResolvedValue(null),
  },
  staff: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  staffAttendance: {
    aggregate: jest.fn().mockResolvedValue({ _count: { id: 22 } }),
  },
  salaryAdvance: {
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({}),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Mock the entire @school-erp/database module so PrismaModule and PrismaService
// don't attempt a real Postgres connection
jest.mock('@school-erp/database', () => ({
  PrismaModule: {
    module: class MockPrismaModule {},
    forRoot: () => ({ module: class MockPrismaModule {} }),
  },
  PrismaService: jest.fn().mockImplementation(() => mockPrismaService),
}));

// ── Test suite ────────────────────────────────────────────────────────────────

describe('PayrollController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Provide a dummy JWT_ACCESS_SECRET so JwtStrategy doesn't throw on boot
    process.env.JWT_ACCESS_SECRET = 'test-secret-that-is-at-least-32-characters-long';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Bypass JWT auth guard for all tests — auth is tested in auth-service
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context: any) => {
          // Inject a fake user so req.user is available in controllers
          const req = context.switchToHttp().getRequest();
          req.user = {
            id: 'user-1',
            email: 'admin@school.test',
            role: 'ADMIN',
            tenantId: 'tenant-1',
            schoolId: 'school-1',
            plan: 'PREMIUM',
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalFilters(new AppErrorFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply default mocks after clearAllMocks
    mockPrismaService.payrollRun.findUnique.mockResolvedValue(null);
    mockPrismaService.payrollRun.create.mockResolvedValue({
      id: 'run-1',
      status: 'DRAFT',
      month: 4,
      year: 2026,
      schoolId: 'school-1',
      academicYearId: 'ay-1',
    });
    mockPrismaService.payrollRun.findMany.mockResolvedValue([
      { id: 'run-1', status: 'DRAFT', month: 4, year: 2026, schoolId: 'school-1' },
    ]);
    mockPrismaService.payrollRun.update.mockResolvedValue({
      id: 'run-1',
      status: 'PROCESSING',
      month: 4,
      year: 2026,
      schoolId: 'school-1',
      payslips: [],
    });
    mockPrismaService.payslip.findMany.mockResolvedValue([]);
    mockPrismaService.staff.findMany.mockResolvedValue([]);
    mockPrismaService.salaryAdvance.findMany.mockResolvedValue([]);
    mockPrismaService.staffAttendance.aggregate.mockResolvedValue({ _count: { id: 22 } });
  });

  // ── Health check ─────────────────────────────────────────────────────────

  describe('GET /payroll/health', () => {
    it('returns 200 with service name', async () => {
      const res = await request(app.getHttpServer())
        .get('/payroll/health')
        .expect(200);

      expect(res.body).toMatchObject({ status: 'ok', service: 'payroll-service' });
    });
  });

  // ── POST /payroll/runs ────────────────────────────────────────────────────

  describe('POST /payroll/runs', () => {
    it('returns 201 with id and status DRAFT when run is created', async () => {
      const res = await request(app.getHttpServer())
        .post('/payroll/runs')
        .send({ academicYearId: 'ay-1', month: 4, year: 2026 })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('DRAFT');
    });

    it('returns 409 when a run already exists for the same month/year', async () => {
      // First call: no existing run → create succeeds
      // Second call: simulate existing run → ConflictError → 409
      mockPrismaService.payrollRun.findUnique.mockResolvedValue({
        id: 'existing-run',
        status: 'DRAFT',
        month: 4,
        year: 2026,
        schoolId: 'school-1',
      });

      await request(app.getHttpServer())
        .post('/payroll/runs')
        .send({ academicYearId: 'ay-1', month: 4, year: 2026 })
        .expect(409);
    });
  });

  // ── GET /payroll/runs ─────────────────────────────────────────────────────

  describe('GET /payroll/runs', () => {
    it('returns 200 with an array of runs', async () => {
      const res = await request(app.getHttpServer())
        .get('/payroll/runs')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('accepts optional year query parameter', async () => {
      const res = await request(app.getHttpServer())
        .get('/payroll/runs?year=2026')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── POST /payroll/runs/:id/process ────────────────────────────────────────

  describe('POST /payroll/runs/:id/process', () => {
    it('returns 404 when the run does not exist', async () => {
      mockPrismaService.payrollRun.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/payroll/runs/non-existent-run/process')
        .send({})
        .expect(404);
    });

    it('returns 409 when run is already processed', async () => {
      mockPrismaService.payrollRun.findUnique.mockResolvedValue({
        id: 'run-1',
        status: 'PROCESSED',
        month: 4,
        year: 2026,
        schoolId: 'school-1',
        payslips: [],
      });

      await request(app.getHttpServer())
        .post('/payroll/runs/run-1/process')
        .send({})
        .expect(409);
    });

    it('returns 200 when processing a DRAFT run with no staff (empty payslips)', async () => {
      mockPrismaService.payrollRun.findUnique.mockResolvedValue({
        id: 'run-1',
        status: 'DRAFT',
        month: 4,
        year: 2026,
        schoolId: 'school-1',
        payslips: [],
      });
      // update: PROCESSING, then PROCESSED
      mockPrismaService.payrollRun.update
        .mockResolvedValueOnce({ id: 'run-1', status: 'PROCESSING', month: 4, year: 2026, schoolId: 'school-1' })
        .mockResolvedValueOnce({ id: 'run-1', status: 'PROCESSED', month: 4, year: 2026, schoolId: 'school-1', payslips: [] });

      const res = await request(app.getHttpServer())
        .post('/payroll/runs/run-1/process')
        .send({})
        .expect(200);

      expect(res.body).toHaveProperty('status');
    });
  });

  // ── GET /payroll/staff/:staffId/payslips ──────────────────────────────────

  describe('GET /payroll/staff/:staffId/payslips', () => {
    it('returns 200 with an array', async () => {
      mockPrismaService.payslip.findMany.mockResolvedValue([
        { id: 'ps-1', staffId: 'staff-1', grossSalary: 30000, netSalary: 26000 },
      ]);

      const res = await request(app.getHttpServer())
        .get('/payroll/staff/staff-1/payslips')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 200 with empty array when no payslips found', async () => {
      mockPrismaService.payslip.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/payroll/staff/unknown-staff/payslips')
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  // ── GET /payroll/runs/:runId/staff/:staffId/payslip ───────────────────────

  describe('GET /payroll/runs/:runId/staff/:staffId/payslip', () => {
    it('returns 200 with payslip data when found', async () => {
      mockPrismaService.payslip.findUnique.mockResolvedValue({
        id: 'ps-1',
        staffId: 'staff-1',
        payrollRunId: 'run-1',
        grossSalary: 30000,
        netSalary: 26000,
        staff: {
          id: 'staff-1',
          user: { profile: { firstName: 'John', lastName: 'Doe' } },
        },
      });

      const res = await request(app.getHttpServer())
        .get('/payroll/runs/run-1/staff/staff-1/payslip')
        .expect(200);

      expect(res.body).toHaveProperty('grossSalary', 30000);
    });

    it('returns 200 with null body when payslip is not found', async () => {
      mockPrismaService.payslip.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/payroll/runs/run-1/staff/unknown-staff/payslip')
        .expect(200);

      expect(res.body).toBeNull();
    });
  });
});
