import { paiseToRupees, rupeesToPaise, calculateGst, calculateLateFee, formatINR } from './currency';

describe('paiseToRupees', () => {
  it('converts 10000 paise to 100 rupees', () => {
    expect(paiseToRupees(10000)).toBe(100);
  });

  it('returns 0 for 0 paise', () => {
    expect(paiseToRupees(0)).toBe(0);
  });

  it('handles fractional conversion (50 paise = 0.5 rupees)', () => {
    expect(paiseToRupees(50)).toBe(0.5);
  });

  it('handles large amounts', () => {
    expect(paiseToRupees(100000)).toBe(1000);
  });
});

describe('rupeesToPaise', () => {
  it('converts 100 rupees to 10000 paise', () => {
    expect(rupeesToPaise(100)).toBe(10000);
  });

  it('returns 0 for 0 rupees', () => {
    expect(rupeesToPaise(0)).toBe(0);
  });

  it('rounds decimal rupees to nearest paise', () => {
    // 10.005 rupees = 1000.5 paise → rounds to 1001
    expect(rupeesToPaise(10.005)).toBe(1001);
  });

  it('handles standard decimal amounts', () => {
    expect(rupeesToPaise(99.99)).toBe(9999);
  });
});

describe('calculateGst', () => {
  it('splits 18% GST correctly: base + cgst + sgst = total', () => {
    const result = calculateGst(11800, 18);
    expect(result.total).toBe(11800);
    expect(result.base + result.cgst + result.sgst).toBe(11800);
  });

  it('cgst and sgst are approximately equal (half of total GST each)', () => {
    const result = calculateGst(11800, 18);
    // total GST = 1800, each half = 900
    expect(Math.abs(result.cgst - result.sgst)).toBeLessThanOrEqual(1);
    expect(result.cgst).toBeCloseTo(result.sgst, 0);
  });

  it('base amount is correct for 18% GST on 11800', () => {
    const result = calculateGst(11800, 18);
    expect(result.base).toBe(10000);
  });

  it('handles 0% GST rate', () => {
    const result = calculateGst(5000, 0);
    expect(result.base).toBe(5000);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.total).toBe(5000);
  });

  it('handles 28% GST', () => {
    const result = calculateGst(12800, 28);
    expect(result.total).toBe(12800);
    expect(result.base + result.cgst + result.sgst).toBe(12800);
  });
});

describe('calculateLateFee', () => {
  it('calculates late fee: principal × dailyRate × days', () => {
    // 10000 paise × 1% per day × 10 days = 1000 paise
    const fee = calculateLateFee(10000, 1, 10);
    expect(fee).toBe(1000);
  });

  it('returns 0 when days is 0', () => {
    expect(calculateLateFee(50000, 2, 0)).toBe(0);
  });

  it('returns 0 when principal is 0', () => {
    expect(calculateLateFee(0, 1, 5)).toBe(0);
  });

  it('rounds the result to nearest integer', () => {
    // 10000 × 1.5% × 1 = 150 — clean integer
    const fee = calculateLateFee(10000, 1.5, 1);
    expect(Number.isInteger(fee)).toBe(true);
  });
});

describe('formatINR', () => {
  it('formats paise as INR currency string', () => {
    const result = formatINR(10000);
    expect(result).toContain('100');
    expect(result).toContain('₹');
  });

  it('formats 0 paise', () => {
    const result = formatINR(0);
    expect(result).toContain('0');
  });
});
