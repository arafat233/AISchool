/** BullMQ queue names */
export declare const QUEUES: {
    readonly EMAIL: "queue:email";
    readonly SMS: "queue:sms";
    readonly PUSH: "queue:push";
    readonly WHATSAPP: "queue:whatsapp";
    readonly PDF_GENERATION: "queue:pdf";
    readonly REPORT_CARD: "queue:report-card";
    readonly FEE_REMINDER: "queue:fee-reminder";
    readonly PAYMENT_WEBHOOK: "queue:payment-webhook";
    readonly ATTENDANCE_ALERT: "queue:attendance-alert";
    readonly BULK_IMPORT: "queue:bulk-import";
    readonly AUDIT_LOG: "queue:audit-log";
};
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
/** Default BullMQ job options */
export declare const DEFAULT_JOB_OPTIONS: {
    attempts: number;
    backoff: {
        type: "exponential";
        delay: number;
    };
    removeOnComplete: {
        age: number;
        count: number;
    };
    removeOnFail: {
        age: number;
        count: number;
    };
};
//# sourceMappingURL=queues.d.ts.map