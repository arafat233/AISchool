/** Kafka topic names — used by producers and consumers */
export declare const KAFKA_TOPICS: {
    readonly USER_CREATED: "auth.user.created";
    readonly USER_UPDATED: "auth.user.updated";
    readonly USER_LOGIN: "auth.user.login";
    readonly USER_LOGOUT: "auth.user.logout";
    readonly PASSWORD_RESET_REQUESTED: "auth.password_reset.requested";
    readonly STUDENT_ADMITTED: "student.admitted";
    readonly STUDENT_PROMOTED: "student.promoted";
    readonly STUDENT_TC_ISSUED: "student.tc.issued";
    readonly ATTENDANCE_MARKED: "attendance.marked";
    readonly ATTENDANCE_ABSENT_ALERT: "attendance.absent.alert";
    readonly FEE_INVOICE_CREATED: "fee.invoice.created";
    readonly FEE_PAYMENT_RECEIVED: "fee.payment.received";
    readonly FEE_OVERDUE_ALERT: "fee.overdue.alert";
    readonly NOTIFICATION_SEND: "notification.send";
    readonly NOTIFICATION_BULK_SEND: "notification.bulk.send";
    readonly EXAM_RESULTS_PUBLISHED: "exam.results.published";
    readonly HALL_TICKET_GENERATED: "exam.hall_ticket.generated";
    readonly PAYROLL_GENERATED: "hr.payroll.generated";
    readonly LEAVE_APPROVED: "hr.leave.approved";
    readonly VEHICLE_LOCATION_UPDATE: "transport.vehicle.location";
    readonly TRIP_STARTED: "transport.trip.started";
    readonly TRIP_ENDED: "transport.trip.ended";
};
export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
//# sourceMappingURL=topics.d.ts.map