import {
  computePF,
  computeESI,
  computeProfessionalTax,
  computeLWF,
  computeAnnualTax,
  computeMonthlyTDS,
  computeLOPDeduction,
} from "./statutory.service";

describe("StatutoryService — pure functions", () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── computePF ──────────────────────────────────────────────────────────────

  describe("computePF", () => {
    it("basic=10000 → employee=1200, employer=1200 (12% of 10000)", () => {
      const result = computePF(10000);
      expect(result.employeeContribution).toBe(1200);
      expect(result.employerContribution).toBe(1200);
    });

    it("basic=20000 → capped at 15000 → employee=1800, employer=1800", () => {
      const result = computePF(20000);
      expect(result.employeeContribution).toBe(1800);
      expect(result.employerContribution).toBe(1800);
    });

    it("basic=0 → both contributions are 0", () => {
      const result = computePF(0);
      expect(result.employeeContribution).toBe(0);
      expect(result.employerContribution).toBe(0);
    });

    it("basic=15000 → exactly at ceiling → employee=1800, employer=1800", () => {
      const result = computePF(15000);
      expect(result.employeeContribution).toBe(1800);
      expect(result.employerContribution).toBe(1800);
    });

    it("basic=5000 → employee=600, employer=600", () => {
      const result = computePF(5000);
      expect(result.employeeContribution).toBe(600);
      expect(result.employerContribution).toBe(600);
    });
  });

  // ─── computeESI ─────────────────────────────────────────────────────────────

  describe("computeESI", () => {
    it("gross=15000 → applicable=true, employee=112.5, employer=487.5", () => {
      const result = computeESI(15000);
      expect(result.applicable).toBe(true);
      expect(result.employeeContribution).toBe(112.5);
      expect(result.employerContribution).toBe(487.5);
    });

    it("gross=25000 → applicable=false, all contributions 0", () => {
      const result = computeESI(25000);
      expect(result.applicable).toBe(false);
      expect(result.employeeContribution).toBe(0);
      expect(result.employerContribution).toBe(0);
    });

    it("gross=21000 (at ceiling) → applicable=true", () => {
      const result = computeESI(21000);
      expect(result.applicable).toBe(true);
      expect(result.employeeContribution).toBe(+(21000 * 0.0075).toFixed(2));
      expect(result.employerContribution).toBe(+(21000 * 0.0325).toFixed(2));
    });

    it("gross=21001 (above ceiling) → applicable=false", () => {
      const result = computeESI(21001);
      expect(result.applicable).toBe(false);
    });
  });

  // ─── computeProfessionalTax ──────────────────────────────────────────────────

  describe("computeProfessionalTax", () => {
    it("MH gross=8000 → 175 (7500 < 8000 ≤ 10000)", () => {
      expect(computeProfessionalTax(8000, "MH")).toBe(175);
    });

    it("MH gross=5000 → 0 (≤ 7500)", () => {
      expect(computeProfessionalTax(5000, "MH")).toBe(0);
    });

    it("MH gross=15000 → 200 (above 10000)", () => {
      expect(computeProfessionalTax(15000, "MH")).toBe(200);
    });

    it("KA gross=12000 → 0 (≤ 15000)", () => {
      expect(computeProfessionalTax(12000, "KA")).toBe(0);
    });

    it("KA gross=20000 → 200 (above 15000)", () => {
      expect(computeProfessionalTax(20000, "KA")).toBe(200);
    });

    it("DEFAULT gross=12000 → 150 (above 10000)", () => {
      expect(computeProfessionalTax(12000, "DEFAULT")).toBe(150);
    });

    it("DEFAULT gross=5000 → 0 (≤ 10000)", () => {
      expect(computeProfessionalTax(5000, "DEFAULT")).toBe(0);
    });

    it("DEFAULT stateCode omitted → same as DEFAULT", () => {
      expect(computeProfessionalTax(12000)).toBe(150);
    });

    it("unknown stateCode falls back to DEFAULT", () => {
      expect(computeProfessionalTax(12000, "XX")).toBe(150);
    });
  });

  // ─── computeLWF ─────────────────────────────────────────────────────────────

  describe("computeLWF", () => {
    it("MH → employee=6, employer=12", () => {
      const result = computeLWF("MH");
      expect(result.employee).toBe(6);
      expect(result.employer).toBe(12);
    });

    it("DEFAULT (or unknown) → employee=10, employer=20", () => {
      expect(computeLWF("DEFAULT")).toEqual({ employee: 10, employer: 20 });
      expect(computeLWF("XX")).toEqual({ employee: 10, employer: 20 });
    });

    it("KA → employee=10, employer=20", () => {
      const result = computeLWF("KA");
      expect(result.employee).toBe(10);
      expect(result.employer).toBe(20);
    });

    it("no arg → returns DEFAULT rates", () => {
      const result = computeLWF();
      expect(result.employee).toBe(10);
      expect(result.employer).toBe(20);
    });
  });

  // ─── computeAnnualTax ────────────────────────────────────────────────────────

  describe("computeAnnualTax", () => {
    it("income=300000 → 0 tax (below first slab)", () => {
      expect(computeAnnualTax(300000)).toBe(0);
    });

    it("income=600000 → 15600 (5% of 300k = 15000 + 4% cess)", () => {
      // 5% of (600000 - 300000) = 15000; +4% cess = 15600
      expect(computeAnnualTax(600000)).toBe(15600);
    });

    it("income=1500000 → correct slab calculation with cess", () => {
      // 0–300k: 0
      // 300–600k: 5% × 300k = 15000
      // 600–900k: 10% × 300k = 30000
      // 900–1200k: 15% × 300k = 45000
      // 1200–1500k: 20% × 300k = 60000
      // Total tax before cess = 150000; +4% cess = 156000
      expect(computeAnnualTax(1500000)).toBe(156000);
    });

    it("income=0 → 0 tax", () => {
      expect(computeAnnualTax(0)).toBe(0);
    });

    it("income=400000 → 5% of 100k = 5000 + 4% cess = 5200", () => {
      expect(computeAnnualTax(400000)).toBe(5200);
    });

    it("custom slabs override default slabs", () => {
      const customSlabs = [
        { upTo: 500000, rate: 0 },
        { upTo: Infinity, rate: 0.10 },
      ];
      // income=700000 → 10% × 200k = 20000 + cess = 20800
      expect(computeAnnualTax(700000, customSlabs)).toBe(20800);
    });
  });

  // ─── computeMonthlyTDS ──────────────────────────────────────────────────────

  describe("computeMonthlyTDS", () => {
    it("annual=600000 → computeAnnualTax(600000)/12 = 15600/12 = 1300", () => {
      const annualTax = computeAnnualTax(600000);
      expect(computeMonthlyTDS(600000)).toBe(+(annualTax / 12).toFixed(2));
    });

    it("annual=300000 → 0 (no tax)", () => {
      expect(computeMonthlyTDS(300000)).toBe(0);
    });

    it("annual=1500000 → 156000/12 = 13000", () => {
      expect(computeMonthlyTDS(1500000)).toBe(13000);
    });
  });

  // ─── computeLOPDeduction ────────────────────────────────────────────────────

  describe("computeLOPDeduction", () => {
    it("gross=26000, workingDays=26, lopDays=2 → 2000", () => {
      expect(computeLOPDeduction(26000, 26, 2)).toBe(2000);
    });

    it("lopDays=0 → 0", () => {
      expect(computeLOPDeduction(26000, 26, 0)).toBe(0);
    });

    it("workingDays=0 → 0 (guard against divide by zero)", () => {
      expect(computeLOPDeduction(26000, 0, 5)).toBe(0);
    });

    it("lopDays > workingDays still calculates proportionally", () => {
      // gross=26000, workingDays=10, lopDays=5 → 13000
      expect(computeLOPDeduction(26000, 10, 5)).toBe(13000);
    });

    it("gross=30000, workingDays=30, lopDays=3 → 3000", () => {
      expect(computeLOPDeduction(30000, 30, 3)).toBe(3000);
    });
  });
});
