"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_JOB_OPTIONS = exports.QUEUES = void 0;
/** BullMQ queue names */
exports.QUEUES = {
    // Notifications
    EMAIL: "queue:email",
    SMS: "queue:sms",
    PUSH: "queue:push",
    WHATSAPP: "queue:whatsapp",
    // Reports / PDF
    PDF_GENERATION: "queue:pdf",
    REPORT_CARD: "queue:report-card",
    // Fees
    FEE_REMINDER: "queue:fee-reminder",
    PAYMENT_WEBHOOK: "queue:payment-webhook",
    // Attendance
    ATTENDANCE_ALERT: "queue:attendance-alert",
    // General
    BULK_IMPORT: "queue:bulk-import",
    AUDIT_LOG: "queue:audit-log",
};
/** Default BullMQ job options */
exports.DEFAULT_JOB_OPTIONS = {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 5000 },
};
//# sourceMappingURL=queues.js.map