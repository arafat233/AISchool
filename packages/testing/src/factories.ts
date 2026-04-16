import { PrismaClient, SubscriptionPlan, TenantType, UserRole } from "@prisma/client";

import { generateSecureToken } from "@school-erp/utils";

export async function createTestTenant(
  prisma: PrismaClient,
  override: Partial<{ name: string; subdomain: string; plan: SubscriptionPlan }> = {},
) {
  return prisma.tenant.create({
    data: {
      name: override.name ?? `Test Tenant ${generateSecureToken(4)}`,
      subdomain: override.subdomain ?? `test-${generateSecureToken(4)}`,
      type: TenantType.SCHOOL,
      plan: override.plan ?? SubscriptionPlan.STANDARD,
      isActive: true,
    },
  });
}

export async function createTestUser(
  prisma: PrismaClient,
  tenantId: string,
  override: Partial<{ email: string; role: UserRole; passwordHash: string }> = {},
) {
  return prisma.user.create({
    data: {
      tenantId,
      email: override.email ?? `test+${generateSecureToken(4)}@example.com`,
      passwordHash: override.passwordHash ?? "$2b$12$testhashtesthashhashhhh", // not a real hash
      role: override.role ?? UserRole.TEACHER,
      isActive: true,
      isEmailVerified: true,
      profile: {
        create: {
          firstName: "Test",
          lastName: "User",
        },
      },
    },
  });
}

export async function createTestSchool(prisma: PrismaClient, tenantId: string) {
  return prisma.school.create({
    data: {
      tenantId,
      name: "Test School",
      address: "1 Test Street",
      city: "Test City",
      state: "Test State",
      country: "India",
      pincode: "000000",
      phone: "+910000000000",
      email: "test@testschool.edu",
      establishedYear: 2020,
      affiliationBoard: "CBSE",
    },
  });
}
