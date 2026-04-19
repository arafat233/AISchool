/**
 * PII Data Masking — for non-production environments.
 *
 * Applied automatically when NODE_ENV !== 'production'.
 * Used during DB dumps for dev/staging environments.
 */

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "****";
  return `****${phone.slice(-4)}`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "x***@***.com";
  return `${local[0]}***@${domain.split(".")[0].slice(0, 2)}***.${domain.split(".").pop()}`;
}

export function maskAadhaar(aadhaar: string): string {
  return `****-****-${aadhaar.replace(/\D/g, "").slice(-4)}`;
}

export function maskPAN(pan: string): string {
  if (!pan || pan.length < 5) return "*****";
  return `${pan.slice(0, 2)}***${pan.slice(-2)}`;
}

export function maskAccountNumber(acc: string): string {
  if (!acc || acc.length < 4) return "****";
  return `${"*".repeat(acc.length - 4)}${acc.slice(-4)}`;
}

/** Apply masking to a student/staff record object */
export function maskPersonRecord(record: Record<string, any>): Record<string, any> {
  const masked = { ...record };
  if (masked.phone) masked.phone = maskPhone(masked.phone);
  if (masked.email) masked.email = maskEmail(masked.email);
  if (masked.aadhaar) masked.aadhaar = maskAadhaar(masked.aadhaar);
  if (masked.pan) masked.pan = maskPAN(masked.pan);
  if (masked.bank_account) masked.bank_account = maskAccountNumber(masked.bank_account);
  if (masked.father_phone) masked.father_phone = maskPhone(masked.father_phone);
  if (masked.mother_phone) masked.mother_phone = maskPhone(masked.mother_phone);
  return masked;
}
