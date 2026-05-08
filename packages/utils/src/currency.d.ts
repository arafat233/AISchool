/**
 * Format amount in Indian Rupees (INR).
 * Uses en-IN locale for lakh/crore formatting.
 */
export declare function formatINR(amountInPaise: number): string;
export declare function paiseToRupees(paise: number): number;
export declare function rupeesToPaise(rupees: number): number;
/** Calculate GST split from inclusive amount */
export declare function calculateGst(amountInclGst: number, gstRatePercent: number): {
    base: number;
    cgst: number;
    sgst: number;
    total: number;
};
/** Calculate late fee with compound interest */
export declare function calculateLateFee(principal: number, dailyRatePercent: number, daysLate: number): number;
//# sourceMappingURL=currency.d.ts.map