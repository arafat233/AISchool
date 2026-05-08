/**
 * Demo seed: 3 schools × 10 grades × 1 section (A) × 40 students = 1,200 students
 * Also seeds: academic years, grade levels, sections, teachers (1 per grade per school)
 */
import {
  PrismaClient,
  UserRole,
  UserStatus,
  StudentStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// Pre-hashed "Admin@123!" bcrypt rounds=12
const PASSWORD_HASH =
  "$2b$12$XFib9lckgCJgJySLYgIJx.9bDNtdSiAIFKKP3cI0aoQtj8t5VKkPm";

const TENANT_ID = "seed-tenant-001";

const SCHOOLS = [
  {
    id: "school-001",
    name: "Delhi Public School – North",
    code: "DPS-N",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110001",
    phone: "+911100000001",
    email: "info@dpsnorth.edu.in",
    boardType: "CBSE",
    address: "1 Rajpath, New Delhi",
  },
  {
    id: "school-002",
    name: "St. Mary's Convent School",
    code: "SMCS",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    phone: "+912200000002",
    email: "info@stmarys.edu.in",
    boardType: "ICSE",
    address: "12 Marine Lines, Mumbai",
  },
  {
    id: "school-003",
    name: "Kendriya Vidyalaya – Sector 5",
    code: "KV-S5",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    phone: "+918000000003",
    email: "info@kvsector5.edu.in",
    boardType: "CBSE",
    address: "5 MG Road, Bengaluru",
  },
];

const FIRST_NAMES = [
  "Aarav","Aditya","Akash","Alok","Amit","Ananya","Anjali","Arjun","Aryan","Ayaan",
  "Deepa","Divya","Farhan","Gaurav","Harini","Ishaan","Jaya","Kabir","Kavya","Kiran",
  "Lakshmi","Manish","Meera","Mohit","Naina","Nikhil","Nisha","Om","Pooja","Priya",
  "Rahul","Raj","Riya","Rohit","Sakshi","Sana","Sanjay","Shreya","Siddharth","Sneha",
  "Suresh","Tanvi","Uday","Uma","Varun","Vikram","Vivek","Yash","Zara","Zoya",
];

const LAST_NAMES = [
  "Sharma","Verma","Gupta","Singh","Kumar","Patel","Mehta","Joshi","Shah","Rao",
  "Nair","Pillai","Reddy","Iyer","Menon","Chopra","Malhotra","Kapoor","Bose","Das",
];

function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pad(n: number, len = 4) {
  return String(n).padStart(len, "0");
}

async function main() {
  console.log("Starting demo seed…\n");

  // ── Ensure tenant exists ─────────────────────────────────────────────────
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      name: "Demo School ERP",
      type: "COMPANY",
      plan: "ENTERPRISE",
      status: "ACTIVE",
    },
  });

  let totalStudents = 0;
  let totalTeachers = 0;

  for (const schoolDef of SCHOOLS) {
    console.log(`\n── School: ${schoolDef.name} ──`);

    // ── School ────────────────────────────────────────────────────────────
    const school = await prisma.school.upsert({
      where: { id: schoolDef.id },
      update: {},
      create: {
        id: schoolDef.id,
        tenantId: TENANT_ID,
        name: schoolDef.name,
        code: schoolDef.code,
        city: schoolDef.city,
        state: schoolDef.state,
        pincode: schoolDef.pincode,
        phone: schoolDef.phone,
        email: schoolDef.email,
        boardType: schoolDef.boardType,
        address: schoolDef.address,
        isActive: true,
      },
    });

    // ── Academic Year ─────────────────────────────────────────────────────
    const ayId = `ay-${school.id}-2024`;
    const academicYear = await prisma.academicYear.upsert({
      where: { id: ayId },
      update: {},
      create: {
        id: ayId,
        schoolId: school.id,
        name: "2024-25",
        startDate: new Date("2024-04-01"),
        endDate: new Date("2025-03-31"),
        isActive: true,
      },
    });

    // ── Grades 1–10 ───────────────────────────────────────────────────────
    for (let grade = 1; grade <= 10; grade++) {
      const gradeName = `Class ${grade}`;
      const gradeId = `grade-${school.id}-${grade}`;

      const gradeLevel = await prisma.gradeLevel.upsert({
        where: { id: gradeId },
        update: {},
        create: {
          id: gradeId,
          schoolId: school.id,
          name: gradeName,
          numericLevel: grade,
          isActive: true,
        },
      });

      // ── Section A ────────────────────────────────────────────────────────
      const sectionId = `section-${school.id}-${grade}-A`;
      const section = await prisma.section.upsert({
        where: { id: sectionId },
        update: {},
        create: {
          id: sectionId,
          gradeLevelId: gradeLevel.id,
          name: "A",
          maxStrength: 40,
          isActive: true,
        },
      });

      // ── Class Teacher ────────────────────────────────────────────────────
      const teacherEmail = `teacher.${schoolDef.code.toLowerCase()}.g${grade}@demo.local`;
      const teacherUserId = `user-teacher-${school.id}-g${grade}`;

      const teacherUser = await prisma.user.upsert({
        where: { id: teacherUserId },
        update: {},
        create: {
          id: teacherUserId,
          tenantId: TENANT_ID,
          email: teacherEmail,
          passwordHash: PASSWORD_HASH,
          role: UserRole.CLASS_TEACHER,
          status: UserStatus.ACTIVE,
          profile: {
            create: {
              firstName: rnd(FIRST_NAMES),
              lastName: rnd(LAST_NAMES),
            },
          },
        },
      });

      const staffId = `staff-${school.id}-g${grade}`;
      await prisma.staff.upsert({
        where: { id: staffId },
        update: {},
        create: {
          id: staffId,
          schoolId: school.id,
          userId: teacherUser.id,
          employeeCode: `EMP-${schoolDef.code}-${pad(grade, 3)}`,
          joinDate: new Date("2022-06-01"),
        },
      });

      await prisma.classTeacher.upsert({
        where: { id: `ct-${school.id}-g${grade}` },
        update: {},
        create: {
          id: `ct-${school.id}-g${grade}`,
          sectionId: section.id,
          staffId: staffId,
          academicYearId: academicYear.id,
          isActive: true,
        },
      });

      totalTeachers++;

      // ── 40 Students ───────────────────────────────────────────────────────
      for (let s = 1; s <= 40; s++) {
        const firstName = rnd(FIRST_NAMES);
        const lastName = rnd(LAST_NAMES);
        const admissionNo = `${schoolDef.code}/${academicYear.name}/${grade}${pad(s)}`;
        const studentUserId = `user-stu-${school.id}-g${grade}-${s}`;
        const studentEmail = `stu.${schoolDef.code.toLowerCase()}.g${grade}.${s}@demo.local`;

        const studentUser = await prisma.user.upsert({
          where: { id: studentUserId },
          update: {},
          create: {
            id: studentUserId,
            tenantId: TENANT_ID,
            email: studentEmail,
            passwordHash: PASSWORD_HASH,
            role: UserRole.STUDENT,
            status: UserStatus.ACTIVE,
            profile: {
              create: { firstName, lastName },
            },
          },
        });

        const studentId = `stu-${school.id}-g${grade}-${s}`;
        await prisma.student.upsert({
          where: { id: studentId },
          update: {},
          create: {
            id: studentId,
            schoolId: school.id,
            userId: studentUser.id,
            admissionNo,
            gradeLevelId: gradeLevel.id,
            sectionId: section.id,
            rollNo: String(s),
            academicYearId: academicYear.id,
            status: StudentStatus.ACTIVE,
            admissionDate: new Date("2024-04-01"),
          },
        });

        totalStudents++;
      }

      console.log(`  Grade ${grade} / Section A — 40 students + 1 teacher seeded`);
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   Schools  : ${SCHOOLS.length}`);
  console.log(`   Teachers : ${totalTeachers}`);
  console.log(`   Students : ${totalStudents}`);
  console.log(`\n   Password for all accounts: Admin@123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
