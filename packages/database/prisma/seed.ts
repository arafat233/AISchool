import { PrismaClient, SubscriptionPlan, TenantType, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Default Super Admin Tenant ──────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: "default" },
    update: {},
    create: {
      name: "School ERP Platform",
      subdomain: "default",
      type: TenantType.SCHOOL,
      plan: SubscriptionPlan.ENTERPRISE,
      isActive: true,
    },
  });

  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

  // ─── Super Admin User ────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Admin@123!", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@schoolerp.local" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@schoolerp.local",
      phone: "+911234567890",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      isEmailVerified: true,
      profile: {
        create: {
          firstName: "Super",
          lastName: "Admin",
        },
      },
    },
  });

  console.log(`✅ Super Admin: ${superAdmin.email}`);

  // ─── Demo School ─────────────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Demo Public School",
      address: "123 Education Street",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      pincode: "400001",
      phone: "+912212345678",
      email: "info@demopublicschool.edu.in",
      establishedYear: 2000,
      affiliationBoard: "CBSE",
      affiliationNumber: "DEMO/2000/001",
    },
  });

  console.log(`✅ School: ${school.name}`);

  // ─── Academic Year ───────────────────────────────────────────────────────
  const academicYear = await prisma.academicYear.upsert({
    where: {
      schoolId_name: { schoolId: school.id, name: "2024-25" },
    },
    update: {},
    create: {
      schoolId: school.id,
      name: "2024-25",
      startDate: new Date("2024-04-01"),
      endDate: new Date("2025-03-31"),
      isCurrent: true,
    },
  });

  console.log(`✅ Academic Year: ${academicYear.name}`);

  // ─── Grade Levels ────────────────────────────────────────────────────────
  const grades = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  for (let i = 0; i < grades.length; i++) {
    await prisma.gradeLevel.upsert({
      where: { schoolId_name: { schoolId: school.id, name: `Grade ${grades[i]}` } },
      update: {},
      create: {
        schoolId: school.id,
        name: `Grade ${grades[i]}`,
        numericLevel: i + 1,
      },
    });
  }
  console.log("✅ Grade levels seeded");

  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
