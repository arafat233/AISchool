import { addDays, differenceInDays, differenceInYears, format, isAfter, isBefore, parseISO, startOfDay, startOfMonth, startOfYear, subDays } from "date-fns";
export { addDays, differenceInDays, differenceInYears, format, isAfter, isBefore, parseISO, startOfDay, startOfMonth, startOfYear, subDays, };
export declare function formatDate(date: Date | string, fmt?: string): string;
export declare function formatDateTime(date: Date | string): string;
export declare function calculateAge(dob: Date | string): number;
export declare function getWorkingDaysCount(from: Date, to: Date, holidays?: Date[]): number;
export declare function getCurrentAcademicYear(): string;
//# sourceMappingURL=date.d.ts.map