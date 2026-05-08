"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subDays = exports.startOfYear = exports.startOfMonth = exports.startOfDay = exports.parseISO = exports.isBefore = exports.isAfter = exports.format = exports.differenceInYears = exports.differenceInDays = exports.addDays = void 0;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.calculateAge = calculateAge;
exports.getWorkingDaysCount = getWorkingDaysCount;
exports.getCurrentAcademicYear = getCurrentAcademicYear;
const date_fns_1 = require("date-fns");
Object.defineProperty(exports, "addDays", { enumerable: true, get: function () { return date_fns_1.addDays; } });
Object.defineProperty(exports, "differenceInDays", { enumerable: true, get: function () { return date_fns_1.differenceInDays; } });
Object.defineProperty(exports, "differenceInYears", { enumerable: true, get: function () { return date_fns_1.differenceInYears; } });
Object.defineProperty(exports, "format", { enumerable: true, get: function () { return date_fns_1.format; } });
Object.defineProperty(exports, "isAfter", { enumerable: true, get: function () { return date_fns_1.isAfter; } });
Object.defineProperty(exports, "isBefore", { enumerable: true, get: function () { return date_fns_1.isBefore; } });
Object.defineProperty(exports, "parseISO", { enumerable: true, get: function () { return date_fns_1.parseISO; } });
Object.defineProperty(exports, "startOfDay", { enumerable: true, get: function () { return date_fns_1.startOfDay; } });
Object.defineProperty(exports, "startOfMonth", { enumerable: true, get: function () { return date_fns_1.startOfMonth; } });
Object.defineProperty(exports, "startOfYear", { enumerable: true, get: function () { return date_fns_1.startOfYear; } });
Object.defineProperty(exports, "subDays", { enumerable: true, get: function () { return date_fns_1.subDays; } });
function formatDate(date, fmt = "dd/MM/yyyy") {
    const d = typeof date === "string" ? (0, date_fns_1.parseISO)(date) : date;
    return (0, date_fns_1.format)(d, fmt);
}
function formatDateTime(date) {
    return formatDate(date, "dd/MM/yyyy HH:mm");
}
function calculateAge(dob) {
    const d = typeof dob === "string" ? (0, date_fns_1.parseISO)(dob) : dob;
    return (0, date_fns_1.differenceInYears)(new Date(), d);
}
function getWorkingDaysCount(from, to, holidays = []) {
    let count = 0;
    let current = (0, date_fns_1.startOfDay)(from);
    const end = (0, date_fns_1.startOfDay)(to);
    const holidayStrings = holidays.map((h) => (0, date_fns_1.format)(h, "yyyy-MM-dd"));
    while (!(0, date_fns_1.isAfter)(current, end)) {
        if (!(0, date_fns_1.isWeekend)(current) && !holidayStrings.includes((0, date_fns_1.format)(current, "yyyy-MM-dd"))) {
            count++;
        }
        current = (0, date_fns_1.addDays)(current, 1);
    }
    return count;
}
function getCurrentAcademicYear() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-indexed
    const year = now.getFullYear();
    if (month >= 4) {
        return `${year}-${String(year + 1).slice(2)}`;
    }
    return `${year - 1}-${String(year).slice(2)}`;
}
//# sourceMappingURL=date.js.map