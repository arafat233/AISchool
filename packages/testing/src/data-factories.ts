/**
 * Factory helpers for generating common test data objects.
 * All factories accept an optional `overrides` map to customise individual fields.
 */

export const UserFactory = {
  build: (overrides: Record<string, unknown> = {}) => ({
    id: 'user-test-id',
    email: 'test@school.com',
    role: 'ADMIN',
    tenantId: 'tenant-1',
    schoolId: 'school-1',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

export const StudentFactory = {
  build: (overrides: Record<string, unknown> = {}) => ({
    id: 'student-test-id',
    admissionNo: 'ADM001',
    fullName: 'Test Student',
    schoolId: 'school-1',
    tenantId: 'tenant-1',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

export const FeeInvoiceFactory = {
  build: (overrides: Record<string, unknown> = {}) => ({
    id: 'invoice-test-id',
    studentId: 'student-test-id',
    amount: 50000,
    status: 'ISSUED',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    schoolId: 'school-1',
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

export const JwtPayloadFactory = {
  build: (overrides: Record<string, unknown> = {}) => ({
    sub: 'user-test-id',
    email: 'test@school.com',
    role: 'ADMIN',
    tenantId: 'tenant-1',
    schoolId: 'school-1',
    plan: 'PRO',
    ...overrides,
  }),
};
