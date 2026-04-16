/**
 * Format amount in Indian Rupees (INR).
 * Uses en-IN locale for lakh/crore formatting.
 */
export function formatINR(amountInPaise: number): string {
  const rupees = amountInPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(rupees);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Calculate GST split from inclusive amount */
export function calculateGst(
  amountInclGst: number,
  gstRatePercent: number,
): { base: number; cgst: number; sgst: number; total: number } {
  const gstMultiplier = 1 + gstRatePercent / 100;
  const base = Math.round(amountInclGst / gstMultiplier);
  const totalGst = amountInclGst - base;
  const half = Math.round(totalGst / 2);
  return { base, cgst: half, sgst: totalGst - half, total: amountInclGst };
}

/** Calculate late fee with compound interest */
export function calculateLateFee(
  principal: number,
  dailyRatePercent: number,
  daysLate: number,
): number {
  return Math.round(principal * (dailyRatePercent / 100) * daysLate);
}
