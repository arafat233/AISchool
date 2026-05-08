import { PrismaClient, UserRole, UserStatus, NotificationChannel } from "@prisma/client";

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
  // ── Notification Templates ──────────────────────────────────────────────────
  const templates = [
    {
      id: "tpl-go-live",
      eventType: "GO_LIVE",
      channel: NotificationChannel.EMAIL,
      language: "en",
      subject: "🎉 {{school_name}} is now live on AISchool!",
      body: `Dear {{contact_name}},\n\nCongratulations! Your school "{{school_name}}" has successfully completed onboarding and is now live.\n\nYou are on the {{plan}} plan. Log in at {{portal_url}}.\n\nWelcome aboard!\nThe AISchool Team`,
      variables: ["school_name", "contact_name", "plan", "portal_url"],
      isActive: true,
    },
    {
      id: "tpl-trial-expiry",
      eventType: "TRIAL_EXPIRY_WARNING",
      channel: NotificationChannel.EMAIL,
      language: "en",
      subject: "⚠️ Your AISchool trial ends in {{days_left}} days",
      body: `Dear {{contact_name}},\n\nYour trial for "{{school_name}}" expires on {{expiry_date}}.\n\nUpgrade at {{billing_url}} to continue without interruption.\n\nThe AISchool Team`,
      variables: ["contact_name", "school_name", "days_left", "expiry_date", "billing_url"],
      isActive: true,
    },
    {
      id: "tpl-monthly-invoice",
      eventType: "MONTHLY_INVOICE",
      channel: NotificationChannel.EMAIL,
      language: "en",
      subject: "Invoice #{{invoice_number}} for {{month_year}} — ₹{{total_amount}}",
      body: `Dear {{contact_name}},\n\nYour invoice for {{month_year}}:\n  Invoice #: {{invoice_number}}\n  Students: {{student_count}}\n  Total Due: ₹{{total_amount}}\n  Due Date: {{due_date}}\n\nPay at {{billing_url}}.\n\nThe AISchool Team`,
      variables: ["contact_name", "invoice_number", "month_year", "student_count", "total_amount", "due_date", "billing_url"],
      isActive: true,
    },
    {
      id: "tpl-payment-confirmation",
      eventType: "PAYMENT_CONFIRMATION",
      channel: NotificationChannel.EMAIL,
      language: "en",
      subject: "✅ Payment Confirmed — Invoice #{{invoice_number}}",
      body: `Dear {{contact_name}},\n\nPayment of ₹{{total_amount}} received via {{payment_method}} (Txn: {{txn_ref}}) on {{payment_date}}.\n\nThank you!\nThe AISchool Team`,
      variables: ["contact_name", "invoice_number", "total_amount", "payment_method", "txn_ref", "payment_date"],
      isActive: true,
    },
    {
      id: "tpl-suspension-notice",
      eventType: "SUSPENSION_NOTICE",
      channel: NotificationChannel.EMAIL,
      language: "en",
      subject: "🔴 Your AISchool account has been suspended",
      body: `Dear {{contact_name}},\n\nYour account for "{{school_name}}" has been suspended.\n\nReason: {{reason}}\n\nContact billing@aischool.in or visit {{billing_url}} to reactivate.\n\nThe AISchool Team`,
      variables: ["contact_name", "school_name", "reason", "billing_url"],
      isActive: true,
    },
  ];

  for (const tpl of templates) {
    await (prisma as any).notificationTemplate.upsert({
      where: { id: tpl.id },
      update: {},
      create: { ...tpl, schoolId: null },
    });
    console.log(`Seeded template: ${tpl.eventType}`);
  }

  console.log("\nDone. Password for all: Admin@123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
