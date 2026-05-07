import { PrismaClient, UserRole, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Pre-hashed "Admin@123!" with bcrypt rounds=12
const PASSWORD_HASH = "$2b$12$XFib9lckgCJgJySLYgIJx.9bDNtdSiAIFKKP3cI0aoQtj8t5VKkPm";

async function main() {
  // Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: "seed-tenant-001" },
    update: {},
    create: { id: "seed-tenant-001", name: "Demo School ERP", type: "COMPANY", plan: "ENTERPRISE", status: "ACTIVE" },
  });

  const users: Array<{ id: string; email: string; role: UserRole; first: string; last: string; phone: string }> = [
    { id: "seed-user-superadmin",  email: "admin@schoolerp.local",    role: UserRole.SUPER_ADMIN,      first: "Super",  last: "Admin",   phone: "+911234567890" },
    { id: "seed-user-schooladmin", email: "schooladmin@demo.local",   role: UserRole.SCHOOL_ADMIN,     first: "School", last: "Admin",   phone: "+911234567891" },
    { id: "seed-user-teacher",     email: "teacher@demo.local",       role: UserRole.SUBJECT_TEACHER,  first: "John",   last: "Teacher", phone: "+911234567892" },
    { id: "seed-user-student",     email: "student@demo.local",       role: UserRole.STUDENT,          first: "Jane",   last: "Student", phone: "+911234567893" },
    { id: "seed-user-parent",      email: "parent@demo.local",        role: UserRole.PARENT,           first: "Bob",    last: "Parent",  phone: "+911234567894" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        tenantId: tenant.id,
        email: u.email,
        phone: u.phone,
        passwordHash: PASSWORD_HASH,
        role: u.role,
        status: UserStatus.ACTIVE,
        profile: { create: { firstName: u.first, lastName: u.last } },
      },
    });
    console.log(`Seeded: ${u.email} (${u.role})`);
  }
  console.log("\nDone. Password for all: Admin@123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
