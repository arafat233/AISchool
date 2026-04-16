export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function titleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => capitalizeFirst(txt));
}

export function truncate(str: string, maxLength: number, suffix = "..."): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(0, user.length - 2))}@${domain}`;
}

export function maskPhone(phone: string): string {
  return phone.replace(/(\+?\d{2,3})\d+(\d{4})$/, "$1****$2");
}

export function generateAdmissionNumber(
  prefix: string,
  year: number,
  sequence: number,
): string {
  return `${prefix}/${year}/${String(sequence).padStart(4, "0")}`;
}

export function generateReceiptNumber(prefix: string, sequence: number): string {
  return `${prefix}${String(sequence).padStart(8, "0")}`;
}
