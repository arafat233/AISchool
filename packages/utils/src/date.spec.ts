import { formatDate, formatDateTime, calculateAge, getWorkingDaysCount, getCurrentAcademicYear } from './date';

describe('formatDate', () => {
  it('formats a Date object as dd/MM/yyyy', () => {
    const date = new Date(2024, 0, 15); // Jan 15 2024
    expect(formatDate(date)).toBe('15/01/2024');
  });

  it('formats an ISO string input', () => {
    expect(formatDate('2024-06-20')).toBe('20/06/2024');
  });

  it('accepts a custom format', () => {
    const date = new Date(2024, 11, 31); // Dec 31 2024
    expect(formatDate(date, 'yyyy-MM-dd')).toBe('2024-12-31');
  });
});

describe('formatDateTime', () => {
  it('includes the date portion', () => {
    const date = new Date(2024, 0, 15, 10, 30);
    const result = formatDateTime(date);
    expect(result).toContain('15/01/2024');
  });

  it('includes the time portion in HH:mm format', () => {
    const date = new Date(2024, 0, 15, 10, 30);
    const result = formatDateTime(date);
    expect(result).toContain('10:30');
  });

  it('formats as dd/MM/yyyy HH:mm', () => {
    const date = new Date(2024, 5, 1, 9, 5); // June 1 2024, 09:05
    expect(formatDateTime(date)).toBe('01/06/2024 09:05');
  });
});

describe('calculateAge', () => {
  it('returns correct age for a known birthdate', () => {
    // Person born in 2000 is ~25 years old in 2025/2026
    const dob = new Date(2000, 0, 1); // Jan 1 2000
    const age = calculateAge(dob);
    expect(age).toBeGreaterThanOrEqual(25);
    expect(age).toBeLessThanOrEqual(27);
  });

  it('accepts ISO string input', () => {
    const age = calculateAge('1990-06-15');
    expect(age).toBeGreaterThanOrEqual(34);
    expect(age).toBeLessThanOrEqual(36);
  });

  it('returns 0 for a newborn (same year)', () => {
    const today = new Date();
    const dob = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    expect(calculateAge(dob)).toBe(0);
  });
});

describe('getWorkingDaysCount', () => {
  it('counts Mon–Fri range correctly (no weekends)', () => {
    // Monday Jan 6 to Friday Jan 10 2025 → 5 working days
    const from = new Date(2025, 0, 6);
    const to = new Date(2025, 0, 10);
    expect(getWorkingDaysCount(from, to)).toBe(5);
  });

  it('excludes weekends', () => {
    // Monday Jan 6 to Sunday Jan 12 2025 → 5 working days (Sat+Sun excluded)
    const from = new Date(2025, 0, 6);
    const to = new Date(2025, 0, 12);
    expect(getWorkingDaysCount(from, to)).toBe(5);
  });

  it('excludes holidays', () => {
    // Monday Jan 6 to Friday Jan 10 2025, with Jan 7 (Tue) as holiday → 4 days
    const from = new Date(2025, 0, 6);
    const to = new Date(2025, 0, 10);
    const holiday = new Date(2025, 0, 7);
    expect(getWorkingDaysCount(from, to, [holiday])).toBe(4);
  });

  it('returns 1 for a single weekday', () => {
    const monday = new Date(2025, 0, 6);
    expect(getWorkingDaysCount(monday, monday)).toBe(1);
  });

  it('returns 0 for a single Saturday', () => {
    const saturday = new Date(2025, 0, 11);
    expect(getWorkingDaysCount(saturday, saturday)).toBe(0);
  });

  it('returns 0 for a single Sunday', () => {
    const sunday = new Date(2025, 0, 12);
    expect(getWorkingDaysCount(sunday, sunday)).toBe(0);
  });
});

describe('getCurrentAcademicYear', () => {
  it('returns format YYYY-YY', () => {
    const year = getCurrentAcademicYear();
    expect(/^\d{4}-\d{2}$/.test(year)).toBe(true);
  });

  it('second part is 2 digits representing the following year', () => {
    const year = getCurrentAcademicYear();
    const [startYear, endYearShort] = year.split('-');
    const startYearNum = parseInt(startYear, 10);
    const expectedEndShort = String(startYearNum + 1).slice(2);
    expect(endYearShort).toBe(expectedEndShort);
  });

  it('returns a year within a reasonable range', () => {
    const year = getCurrentAcademicYear();
    const startYear = parseInt(year.split('-')[0], 10);
    expect(startYear).toBeGreaterThanOrEqual(2024);
    expect(startYear).toBeLessThanOrEqual(2030);
  });
});
