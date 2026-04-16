import {
  addDays,
  differenceInDays,
  differenceInYears,
  format,
  isAfter,
  isBefore,
  isWeekend,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
} from "date-fns";

export {
  addDays,
  differenceInDays,
  differenceInYears,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
};

export function formatDate(date: Date | string, fmt = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt);
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, "dd/MM/yyyy HH:mm");
}

export function calculateAge(dob: Date | string): number {
  const d = typeof dob === "string" ? parseISO(dob) : dob;
  return differenceInYears(new Date(), d);
}

export function getWorkingDaysCount(from: Date, to: Date, holidays: Date[] = []): number {
  let count = 0;
  let current = startOfDay(from);
  const end = startOfDay(to);
  const holidayStrings = holidays.map((h) => format(h, "yyyy-MM-dd"));

  while (!isAfter(current, end)) {
    if (!isWeekend(current) && !holidayStrings.includes(format(current, "yyyy-MM-dd"))) {
      count++;
    }
    current = addDays(current, 1);
  }
  return count;
}

export function getCurrentAcademicYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-indexed
  const year = now.getFullYear();
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(2)}`;
  }
  return `${year - 1}-${String(year).slice(2)}`;
}
