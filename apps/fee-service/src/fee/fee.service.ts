import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, BusinessRuleError } from "@school-erp/errors";
import { rupeesToPaise, paiseToRupees, formatINR, calculateLateFee } from "@school-erp/utils";
import { RazorpayService } from "../payment/razorpay.service";

@Injectable()
export class FeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
  ) {}

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
    const students = await this.prisma.student.findMany({ where: { schoolId, sectionId }, include: { section: { include: { gradeLevel: true } } } });
    const feeStructures = await this.prisma.feeStructure.findMany({
      where: { schoolId, academicYearId, gradeLevelId: students[0]?.section.gradeLevelId },
      include: { feeHead: true },
    });

    const invoices = await Promise.all(
      students.map(async (student) => {
        const existing = await this.prisma.feeInvoice.findFirst({ where: { studentId: student.id, academicYearId, ...(termId ? { termId } : {}) } });
        if (existing) return existing;

        const totalAmount = feeStructures.reduce((sum, fs) => sum + fs.amount, 0);
        return this.prisma.feeInvoice.create({
          data: {
            schoolId,
            studentId: student.id,
            academicYearId,
            termId,
            totalAmount,
            dueDate: feeStructures[0]?.dueDate ?? new Date(),
            items: {
              create: feeStructures.map((fs) => ({ feeHeadId: fs.feeHeadId, amount: fs.amount, description: fs.feeHead.name })),
            },
          },
        });
      }),
    );
    return { generated: invoices.length };
  }

  // ─── Payments ─────────────────────────────────────────────────────────────
  async recordCashPayment(invoiceId: string, data: { amountPaid: number; receivedById: string; remarks?: string }) {
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

    return payment;
  }

  async createRazorpayOrder(invoiceId: string) {
    const invoice = await this.prisma.feeInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const paidSoFar = await this.prisma.feePayment.aggregate({ where: { invoiceId }, _sum: { amountPaid: true } });
    const outstanding = invoice.totalAmount - (paidSoFar._sum.amountPaid ?? 0);
    if (outstanding <= 0) throw new BusinessRuleError("ALREADY_PAID", "Invoice is fully paid");

    const order = await this.razorpay.createOrder(outstanding, "INR", `INV-${invoiceId.slice(0, 8)}`);
    return { orderId: order.id, amount: outstanding, amountFormatted: formatINR(outstanding) };
  }

  async verifyOnlinePayment(invoiceId: string, data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string; receivedById: string }) {
    const valid = this.razorpay.verifySignature(data.razorpayOrderId, data.razorpayPaymentId, data.razorpaySignature);
    if (!valid) throw new BusinessRuleError("INVALID_SIGNATURE", "Payment verification failed");

    const invoice = await this.prisma.feeInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const paidSoFar = await this.prisma.feePayment.aggregate({ where: { invoiceId }, _sum: { amountPaid: true } });
    const outstanding = invoice.totalAmount - (paidSoFar._sum.amountPaid ?? 0);

    await this.prisma.feePayment.create({
      data: { invoiceId, amountPaid: outstanding, mode: "ONLINE", receivedById: data.receivedById, transactionId: data.razorpayPaymentId, paymentDate: new Date() },
    });
    await this.prisma.feeInvoice.update({ where: { id: invoiceId }, data: { status: "PAID" as any } });
    return { success: true, paymentId: data.razorpayPaymentId };
  }

  async applyConcession(data: { invoiceId: string; amount: number; reason: string; approvedById: string }) {
    return this.prisma.concession.create({
      data: { invoiceId: data.invoiceId, amount: rupeesToPaise(data.amount), reason: data.reason, approvedById: data.approvedById },
    });
  }

  async getStudentInvoices(studentId: string) {
    return this.prisma.feeInvoice.findMany({
      where: { studentId },
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
