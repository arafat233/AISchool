import { Injectable } from "@nestjs/common";

// ─── PF ──────────────────────────────────────────────────────────────────────

const PF_EMPLOYEE_RATE = 0.12;     // 12% of Basic
const PF_EMPLOYER_RATE = 0.12;     // 12% of Basic
const PF_WAGE_CEILING = 15000;     // PF computed on min(Basic, ₹15000)

export function computePF(basic: number) {
  const wage = Math.min(basic, PF_WAGE_CEILING);
  return {
    employeeContribution: +(wage * PF_EMPLOYEE_RATE).toFixed(2),
    employerContribution: +(wage * PF_EMPLOYER_RATE).toFixed(2),
  };
}

// ─── ESI ─────────────────────────────────────────────────────────────────────

const ESI_GROSS_CEILING = 21000;   // applicable if gross ≤ ₹21,000
const ESI_EMPLOYEE_RATE = 0.0075;  // 0.75%
const ESI_EMPLOYER_RATE = 0.0325;  // 3.25%

export function computeESI(gross: number) {
  if (gross > ESI_GROSS_CEILING) return { applicable: false, employeeContribution: 0, employerContribution: 0 };
  return {
    applicable: true,
    employeeContribution: +(gross * ESI_EMPLOYEE_RATE).toFixed(2),
    employerContribution: +(gross * ESI_EMPLOYER_RATE).toFixed(2),
  };
}

// ─── Professional Tax (state-wise monthly slabs) ──────────────────────────────

// Key = stateCode, value = sorted slabs [{upTo, monthly}]
// upTo=Infinity means "above last threshold"
const PT_SLABS: Record<string, Array<{ upTo: number; monthly: number }>> = {
  MH: [ // Maharashtra
    { upTo: 7500, monthly: 0 },
    { upTo: 10000, monthly: 175 },
    { upTo: Infinity, monthly: 200 },    // Feb = 300
  ],
  KA: [ // Karnataka
    { upTo: 15000, monthly: 0 },
    { upTo: Infinity, monthly: 200 },
  ],
  WB: [ // West Bengal
    { upTo: 10000, monthly: 0 },
    { upTo: 15000, monthly: 110 },
    { upTo: 25000, monthly: 130 },
    { upTo: Infinity, monthly: 150 },
  ],
  AP: [
    { upTo: 15000, monthly: 0 },
    { upTo: 20000, monthly: 150 },
    { upTo: Infinity, monthly: 200 },
  ],
  DEFAULT: [
    { upTo: 10000, monthly: 0 },
    { upTo: Infinity, monthly: 150 },
  ],
};

export function computeProfessionalTax(gross: number, stateCode = "DEFAULT"): number {
  const slabs = PT_SLABS[stateCode] ?? PT_SLABS.DEFAULT;
  for (const slab of slabs) {
    if (gross <= slab.upTo) return slab.monthly;
  }
  return 0;
}

// ─── Labour Welfare Fund (bi-annual, state-wise) ──────────────────────────────

const LWF_RATES: Record<string, { employee: number; employer: number }> = {
  MH: { employee: 6, employer: 12 },
  KA: { employee: 10, employer: 20 },
  DEFAULT: { employee: 10, employer: 20 },
};

export function computeLWF(stateCode = "DEFAULT") {
  return LWF_RATES[stateCode] ?? LWF_RATES.DEFAULT;
}

// ─── TDS per income tax slab ──────────────────────────────────────────────────

// Default FY 2024-25 new tax regime slabs
const DEFAULT_TAX_SLABS = [
  { upTo: 300000, rate: 0 },
  { upTo: 600000, rate: 0.05 },
  { upTo: 900000, rate: 0.10 },
  { upTo: 1200000, rate: 0.15 },
  { upTo: 1500000, rate: 0.20 },
  { upTo: Infinity, rate: 0.30 },
];

export function computeAnnualTax(annualIncome: number, customSlabs?: Array<{ upTo: number; rate: number }>): number {
  const slabs = customSlabs ?? DEFAULT_TAX_SLABS;
  let tax = 0;
  let prev = 0;
  for (const slab of slabs) {
    if (annualIncome <= prev) break;
    const taxable = Math.min(annualIncome, slab.upTo) - prev;
    tax += taxable * slab.rate;
    prev = slab.upTo;
    if (slab.upTo === Infinity) break;
  }
  // Add 4% health+education cess
  return +(tax * 1.04).toFixed(2);
}

export function computeMonthlyTDS(annualGross: number, customSlabs?: Array<{ upTo: number; rate: number }>): number {
  return +(computeAnnualTax(annualGross, customSlabs) / 12).toFixed(2);
}

// ─── LOP deduction ───────────────────────────────────────────────────────────

export function computeLOPDeduction(gross: number, workingDays: number, lopDays: number): number {
  if (workingDays <= 0 || lopDays <= 0) return 0;
  return +(gross * (lopDays / workingDays)).toFixed(2);
}

@Injectable()
export class StatutoryService {
  computePF = computePF;
  computeESI = computeESI;
  computeProfessionalTax = computeProfessionalTax;
  computeLWF = computeLWF;
  computeAnnualTax = computeAnnualTax;
  computeMonthlyTDS = computeMonthlyTDS;
  computeLOPDeduction = computeLOPDeduction;
}
