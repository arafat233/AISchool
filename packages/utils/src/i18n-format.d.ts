/**
 * Locale-aware formatting helpers.
 * Uses Intl API — no external dependencies.
 *
 * Supported locales: en-IN, hi-IN, te-IN, ta-IN, kn-IN, ml-IN
 */
export type AppLocale = "en" | "hi" | "te" | "ta" | "kn" | "ml";
export declare function toIntlLocale(locale: AppLocale): string;
/**
 * Format Indian Rupee amounts.
 * ₹1,23,456.00 in en-IN; ₹1,23,456.00 in all Indian locales.
 */
export declare function formatCurrency(amount: number, locale?: AppLocale, options?: Partial<Intl.NumberFormatOptions>): string;
/**
 * Format numbers with locale-specific grouping.
 * e.g. 1,23,456 in Indian system.
 */
export declare function formatNumber(amount: number, locale?: AppLocale): string;
/**
 * Format a Date object as a locale-appropriate date string.
 * Default: DD/MM/YYYY for all Indian locales.
 */
export declare function formatDate(date: Date | string, locale?: AppLocale, options?: Intl.DateTimeFormatOptions): string;
/**
 * Format a Date as time string.
 */
export declare function formatTime(date: Date | string, locale?: AppLocale, options?: Intl.DateTimeFormatOptions): string;
/**
 * Relative time formatting — "2 hours ago", "in 3 days"
 */
export declare function formatRelativeTime(date: Date | string, locale?: AppLocale): string;
/**
 * Notification template interpolation — replace {key} placeholders.
 */
export declare function interpolate(template: string, vars: Record<string, string | number>): string;
//# sourceMappingURL=i18n-format.d.ts.map