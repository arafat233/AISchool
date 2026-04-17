import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";

export type CalcType = "FIXED" | "PERCENT_OF_BASIC" | "PERCENT_OF_GROSS";

@Injectable()
export class SalaryStructureService {
  constructor(private readonly prisma: PrismaService) {}

  async createComponent(designationId: string, data: {
    name: string; isEarning: boolean; calcType: CalcType; value: number; isStatutory?: boolean;
  }) {
    return this.prisma.salaryStructureComponent.create({
      data: { designationId, name: data.name, isEarning: data.isEarning, calcType: data.calcType, value: data.value, isStatutory: data.isStatutory ?? false },
    });
  }

  async updateComponent(id: string, data: Partial<{ name: string; isEarning: boolean; calcType: CalcType; value: number; isStatutory: boolean }>) {
    return this.prisma.salaryStructureComponent.update({ where: { id }, data });
  }

  async deleteComponent(id: string) {
    return this.prisma.salaryStructureComponent.delete({ where: { id } });
  }

  async getStructure(designationId: string) {
    return this.prisma.salaryStructureComponent.findMany({
      where: { designationId },
      orderBy: [{ isEarning: "desc" }, { name: "asc" }],
    });
  }

  // ─── Calculate gross, deductions, net for a given basic ─────────────────────

  computeSalary(components: any[], basicAmount: number): {
    earnings: Record<string, number>;
    deductions: Record<string, number>;
    gross: number;
    totalDeductions: number;
    net: number;
  } {
    const earnings: Record<string, number> = {};
    const deductions: Record<string, number> = {};
    let gross = 0;

    // Pass 1: compute earnings
    for (const c of components.filter((c) => c.isEarning)) {
      let amt = 0;
      if (c.calcType === "FIXED") amt = +c.value;
      else if (c.calcType === "PERCENT_OF_BASIC") amt = +(+c.value / 100 * basicAmount).toFixed(2);
      earnings[c.name] = amt;
      gross += amt;
    }

    // Pass 2: compute deductions (after gross is known)
    let totalDed = 0;
    for (const c of components.filter((c) => !c.isEarning)) {
      let amt = 0;
      if (c.calcType === "FIXED") amt = +c.value;
      else if (c.calcType === "PERCENT_OF_BASIC") amt = +(+c.value / 100 * basicAmount).toFixed(2);
      else if (c.calcType === "PERCENT_OF_GROSS") amt = +(+c.value / 100 * gross).toFixed(2);
      deductions[c.name] = amt;
      totalDed += amt;
    }

    return { earnings, deductions, gross, totalDeductions: totalDed, net: +(gross - totalDed).toFixed(2) };
  }
}
