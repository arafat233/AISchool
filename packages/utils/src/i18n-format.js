"use strict";
/**
 * Locale-aware formatting helpers.
 * Uses Intl API — no external dependencies.
 *
 * Supported locales: en-IN, hi-IN, te-IN, ta-IN, kn-IN, ml-IN
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toIntlLocale = toIntlLocale;
exports.formatCurrency = formatCurrency;
exports.formatNumber = formatNumber;
exports.formatDate = formatDate;
exports.formatTime = formatTime;
exports.formatRelativeTime = formatRelativeTime;
exports.interpolate = interpolate;
const INTL_LOCALE_MAP = {
    en: "en-IN",
    hi: "hi-IN",
    te: "te-IN",
    ta: "ta-IN",
    kn: "kn-IN",
    ml: "ml-IN",
};
function toIntlLocale(locale) {
    return INTL_LOCALE_MAP[locale] ?? "en-IN";
}
/**
 * Format Indian Rupee amounts.
 * ₹1,23,456.00 in en-IN; ₹1,23,456.00 in all Indian locales.
 */
function formatCurrency(amount, locale = "en", options) {
    return new Intl.NumberFormat(toIntlLocale(locale), {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        ...options,
    }).format(amount);
}
/**
 * Format numbers with locale-specific grouping.
 * e.g. 1,23,456 in Indian system.
 */
function formatNumber(amount, locale = "en") {
    return new Intl.NumberFormat(toIntlLocale(locale)).format(amount);
}
/**
 * Format a Date object as a locale-appropriate date string.
 * Default: DD/MM/YYYY for all Indian locales.
 */
function formatDate(date, locale = "en", options) {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(toIntlLocale(locale), {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        ...options,
    }).format(d);
}
/**
 * Format a Date as time string.
 */
function formatTime(date, locale = "en", options) {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(toIntlLocale(locale), {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        ...options,
    }).format(d);
}
/**
 * Relative time formatting — "2 hours ago", "in 3 days"
 */
function formatRelativeTime(date, locale = "en") {
    const d = typeof date === "string" ? new Date(date) : date;
    const diffMs = d.getTime() - Date.now();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHr / 24);
    const rtf = new Intl.RelativeTimeFormat(toIntlLocale(locale), { numeric: "auto" });
    if (Math.abs(diffDay) >= 1)
        return rtf.format(diffDay, "day");
    if (Math.abs(diffHr) >= 1)
        return rtf.format(diffHr, "hour");
    if (Math.abs(diffMin) >= 1)
        return rtf.format(diffMin, "minute");
    return rtf.format(diffSec, "second");
}
/**
 * Notification template interpolation — replace {key} placeholders.
 */
function interpolate(template, vars) {
    return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}
//# sourceMappingURL=i18n-format.js.map