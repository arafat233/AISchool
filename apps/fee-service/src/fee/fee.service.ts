import { Injectable, Logger, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, BusinessRuleError } from "@school-erp/errors";
import { rupeesToPaise, paiseToRupees, formatINR, calculateLateFee } from "@school-erp/utils";
import { Queue } from "bullmq";
import { QUEUES, DEFAULT_JOB_OPTIONS } from "@school-erp/events";
import { RazorpayService } from "../payment/razorpay.service";

@Injectable()
export class FeeService {
  private readonly logger = new Logger(FeeService.name);
  private readonly paymentQueue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
  ) {
    this.paymentQueue = new Queue(QUEUES.FEE_PAYMENT_RECEIVED, {
      connection: {
        host: process.env.REDIS_HOST ?? "localhost",
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    });
  }

  // ─── Fee Structure ────────────────────────────────────────────────────────
  async createFeeHead(schoolId: string, data: { name: string; description?: string; isOptional?: boolean }) {
    return this.prisma.feeHead.create({ data: { schoolId, ...data } });
  }

  async getFeeHeads(schoolId: string) {
    return this.prisma.feeHead.findMany({ where: { schoolId }, orderBy: { name: "asc" } });
  }

  async createFeeStructure(data: {
    schoolId: string; academicYearId: string; gradeLevelId: string;
    items: Array<{ feeHeadId: string; amount: number; dueDate: string }>;
  }) {
    return this.prisma.$transaction(
      data.items.map((item) =>
        this.prisma.feeStructure.upsert({
          where: { academicYearId_gradeLevelId_feeHeadId: { academicYearId: data.academicYearId, gradeLevelId: data.gradeLevelId, feeHeadId: item.feeHeadId } },
          update: { amount: rupeesToPaise(item.amount), dueDate: new Date(item.dueDate) },
          create: { schoolId: data.schoolId, academicYearId: data.academicYearId, gradeLevelId: data.gradeLevelId, feeHeadId: item.feeHeadId, amount: rupeesToPaise(item.amount), dueDate: new Date(item.dueDate) },
        }),
      ),
    );
  }

  // ─── Invoice Generation ───────────────────────────────────────────────────
  async generateInvoicesForSection(schoolId: string, sectionId: string, academicYearId: string, termId?: string) {
    const students = await this.prisma.student.findMany({
      where: { schoolId, sectionId },
      include: { section: { include: { gradeLevel: true } } },
    });
    if (students.length === 0) return { generated: 0 };

    const feeStructures = await this.prisma.feeStructure.findMany({
      where: { schoolId, academicYearId, gradeLevelId: students[0].section.gradeLevelId },
      include: { feeHead: true },
    });
    if (feeStructures.length === 0) return { generated: 0 };

    // Batch-fetch existing invoices (avoids N per-student queries)
    const studentIds = students.map((s) => s.id);
    const existing = await this.prisma.feeInvoice.findMany({
      where: { studentId: { in: studentIds }, academicYearId, ...(termId ? { termId } : {}) },
      select: { studentId: true },
    });
    const alreadyProvisioned = new Set(existing.map((e) => e.studentId));
    const newStudents = students.filter((s) => !alreadyProvisioned.has(s.id));

    if (newStudents.length === 0) return { generated: 0 };

    const totalAmount = feeStructures.reduce((sum, fs) => sum + fs.amount, 0);
    const dueDate = feeStructures[0].dueDate ?? new Date();

    // Create all invoices + items in a single transaction
    await this.prisma.$transaction(
      newStudents.map((student) =>
        this.prisma.feeInvoice.create({
          data: {
            schoolId,
            studentId: student.id,
            academicYearId,
            termId,
            totalAmount,
            dueDate,
            items: {
              create: feeStructures.map((fs) => ({
                feeHeadId: fs.feeHeadId,
                amount: fs.amount,
                description: fs.feeHead.name,
              })),
            },
          },
          select: { id: true },
        }),
      ),
    );

    return { generated: newStudents.length };
  }

  // ─── Payments ─────────────────────────────────────────────────────────────
  private async assertInvoiceSchool(invoiceId: string, schoolId: string) {
    const inv = await this.prisma.feeInvoice.findUnique({ where: { id: invoiceId }, select: { schoolId: true } });
    if (!inv) throw new NotFoundError("Invoice not found");
    if (inv.schoolId !== schoolId) throw new ForbiddenException();
  }

  async recordCashPayment(invoiceId: string, schoolId: string, data: { amountPaid: number; receivedById: string; remarks?: string }) {
    await this.assertInvoiceSchool(invoiceId, schoolId);
    const invoice = await this.prisma.feeInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const paidSoFar = await this.prisma.feePayment.aggregate({ where: { invoiceId }, _sum: { amountPaid: true } });
    const alreadyPaid = paidSoFar._sum.amountPaid ?? 0;
    const remaining = invoice.totalAmount - alreadyPaid;
    const payPaise = rupeesToPaise(data.amountPaid);
    if (payPaise > remaining) throw new BusinessRuleError("OVERPAYMENT", `Amount exceeds outstanding balance of ${formatINR(remaining)}`);

    const payment = await this.prisma.feePayment.create({
      data: { invoiceId, amountPaid: payPaise, mode: "CASH", receivedById: data.receivedById, remarks: data.remarks, paymentDate: new Date() },
    });

    const newTotal = alreadyPaid + payPaise;
    const status = newTotal >= invoice.totalAmount ? "PAID" : "PARTIALLY_PAID";
    await this.prisma.feeInvoice.update({ where: { id: invoiceId }, data: { status: status as any } });

    await this.paymentQueue.add(
      "fee.payment.received",
      { paymentId: payment.id, invoiceId, studentId: invoice.studentId, amount: payPaise, mode: "CASH" },
      DEFAULT_JOB_OPTIONS,
    );
    this.logger.log(`fee.payment.received event published for payment ${payment.id}`);

    return payment;
  }

  async createRazorpayOrder(invoiceId: string, schoolId: string) {
    await this.assertInvoiceSchool(invoiceId, schoolId);
    const invoice = await this.prisma.feeInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const paidSoFar = await this.prisma.feePayment.aggregate({ where: { invoiceId }, _sum: { amountPaid: true } });
    const outstanding = invoice.totalAmount - (paidSoFar._sum.amountPaid ?? 0);
    if (outstanding <= 0) throw new BusinessRuleError("ALREADY_PAID", "Invoice is fully paid");

    const order = await this.razorpay.createOrder(outstanding, "INR", `INV-${invoiceId.slice(0, 8)}`);
    return { orderId: order.id, amount: outstanding, amountFormatted: formatINR(outstanding) };
  }

  async verifyOnlinePayment(invoiceId: string, schoolId: string, data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string; receivedById: string }) {
    await this.assertInvoiceSchool(invoiceId, schoolId);
    const valid = this.razorpay.verifySignature(data.razorpayOrderId, data.razorpayPaymentId, data.razorpaySignature);
    if (!valid) throw new BusinessRuleError("INVALID_SIGNATURE", "Payment verification failed");

    // Idempotency: reject duplicate payment IDs
    const duplicate = await this.prisma.feePayment.findFirst({ where: { transactionId: data.razorpayPaymentId } });
    if (duplicate) return { success: true, paymentId: data.razorpayPaymentId, duplicate: true };

    const invoice = await this.prisma.feeInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const paidSoFar = await this.prisma.feePayment.aggregate({ where: { invoiceId }, _sum: { amountPaid: true } });
    const outstanding = invoice.totalAmount - (paidSoFar._sum.amountPaid ?? 0);
    if (outstanding <= 0) throw new BusinessRuleError("ALREADY_PAID", "Invoice is already fully paid");

    const onlinePayment = await this.prisma.feePayment.create({
      data: { invoiceId, amountPaid: outstanding, mode: "ONLINE", receivedById: data.receivedById, transactionId: data.razorpayPaymentId, paymentDate: new Date() },
    });
    await this.prisma.feeInvoice.update({ where: { id: invoiceId }, data: { status: "PAID" as any } });

    await this.paymentQueue.add(
      "fee.payment.received",
      { paymentId: onlinePayment.id, invoiceId, studentId: invoice.studentId, amount: outstanding, mode: "ONLINE", transactionId: data.razorpayPaymentId },
      DEFAULT_JOB_OPTIONS,
    );
    this.logger.log(`fee.payment.received event published for payment ${onlinePayment.id}`);

    return { success: true, paymentId: data.razorpayPaymentId };
  }

  async applyConcession(data: { invoiceId: string; amount: number; reason: string; approvedById: string; schoolId: string }) {
    await this.assertInvoiceSchool(data.invoiceId, data.schoolId);
    const invoice = await this.prisma.feeInvoice.findUniqueOrThrow({ where: { id: data.invoiceId } });
    const amountPaise = rupeesToPaise(data.amount);
    const existingConcessions = await this.prisma.concession.aggregate({ where: { invoiceId: data.invoiceId }, _sum: { amount: true } });
    const totalConcessions = (existingConcessions._sum.amount ?? 0) + amountPaise;
    if (totalConcessions > invoice.totalAmount) {
      throw new BusinessRuleError("CONCESSION_EXCEEDS_INVOICE", "Total concessions cannot exceed invoice amount");
    }
    return this.prisma.concession.create({
      data: { invoiceId: data.invoiceId, amount: amountPaise, reason: data.reason, approvedById: data.approvedById },
    });
  }

  async getStudentInvoices(studentId: string, schoolId: string) {
    return this.prisma.feeInvoice.findMany({
      where: { studentId, schoolId },
      include: { items: { include: { feeHead: true } }, payments: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOutstandingReport(schoolId: string, academicYearId: string) {
    return this.prisma.feeInvoice.findMany({
      where: { schoolId, academicYearId, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      include: { student: { select: { firstName: true, lastName: true, admissionNo: true } }, payments: true },
      orderBy: { dueDate: "asc" },
    });
  }
}
