import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";

const GRATUITY_MIN_YEARS = 5;   // eligible only after 5 years

@Injectable()
export class GratuityService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Monthly provision accrual: (Basic+DA) × years × 15/26 ─────────────────

  async accrueMonthlyProvision(staffId: string, month: number, year: number) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: { designation: { include: { salaryComponents: true } } },
    });
    if (!staff) throw new NotFoundError("Staff not found");

    const components = (staff.designation as any)?.salaryComponents ?? [];
    const basic = +(components.find((c: any) => c.name === "Basic")?.value ?? 0);
    const da = +(components.find((c: any) => c.name === "DA")?.value ?? 0);

    const yearsOfService = (new Date(year, month - 1).getTime() - new Date(staff.joinDate).getTime()) / (365.25 * 86400000);
    const monthlyProvision = +((basic + da) * yearsOfService * 15 / 26 / 12).toFixed(2);

    return this.prisma.gratuityProvision.upsert({
      where: { staffId_month_year: { staffId, month, year } },
      update: { monthlyProvision, yearsOfService: +yearsOfService.toFixed(2), basicPlusDA: basic + da },
      create: { staffId, month, year, monthlyProvision, yearsOfService: +yearsOfService.toFixed(2), basicPlusDA: basic + da },
    });
  }

  // ─── Calculate gratuity on exit ───────────────────────────────────────────────

  async calculateGratuity(staffId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: { designation: { include: { salaryComponents: true } } },
    });
    if (!staff) throw new NotFoundError("Staff not found");

    const yearsOfService = (new Date().getTime() - new Date(staff.joinDate).getTime()) / (365.25 * 86400000);
    const eligible = yearsOfService >= GRATUITY_MIN_YEARS;

    const components = (staff.designation as any)?.salaryComponents ?? [];
    const basic = +(components.find((c: any) => c.name === "Basic")?.value ?? 0);
    const da = +(components.find((c: any) => c.name === "DA")?.value ?? 0);

    // Formula: (Basic+DA) × years × 15/26
    const gratuityAmount = eligible ? +((basic + da) * Math.floor(yearsOfService) * 15 / 26).toFixed(2) : 0;

    return {
      staffId,
      yearsOfService: +yearsOfService.toFixed(2),
      eligible,
      basicPlusDA: basic + da,
      gratuityAmount,
      message: eligible ? `Eligible for ₹${gratuityAmount.toLocaleString("en-IN")}` : `Minimum ${GRATUITY_MIN_YEARS} years required (${yearsOfService.toFixed(1)} completed)`,
    };
  }

  async getTotalProvision(schoolId: string, upToYear: number, upToMonth: number) {
    const result = await this.prisma.gratuityProvision.aggregate({
      where: {
        staff: { schoolId },
        OR: [
          { year: { lt: upToYear } },
          { year: upToYear, month: { lte: upToMonth } },
        ],
      },
      _sum: { monthlyProvision: true },
    });
    return { schoolId, totalProvision: result._sum.monthlyProvision ?? 0 };
  }
}
