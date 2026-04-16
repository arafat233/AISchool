/** Kafka topic names — used by producers and consumers */
export const KAFKA_TOPICS = {
  // Auth
  USER_CREATED: "auth.user.created",
  USER_UPDATED: "auth.user.updated",
  USER_LOGIN: "auth.user.login",
  USER_LOGOUT: "auth.user.logout",
  PASSWORD_RESET_REQUESTED: "auth.password_reset.requested",

  // Students
  STUDENT_ADMITTED: "student.admitted",
  STUDENT_PROMOTED: "student.promoted",
  STUDENT_TC_ISSUED: "student.tc.issued",

  // Attendance
  ATTENDANCE_MARKED: "attendance.marked",
  ATTENDANCE_ABSENT_ALERT: "attendance.absent.alert",

  // Fees
  FEE_INVOICE_CREATED: "fee.invoice.created",
  FEE_PAYMENT_RECEIVED: "fee.payment.received",
  FEE_OVERDUE_ALERT: "fee.overdue.alert",

  // Notifications
  NOTIFICATION_SEND: "notification.send",
  NOTIFICATION_BULK_SEND: "notification.bulk.send",

  // Exams
  EXAM_RESULTS_PUBLISHED: "exam.results.published",
  HALL_TICKET_GENERATED: "exam.hall_ticket.generated",

  // HR / Payroll
  PAYROLL_GENERATED: "hr.payroll.generated",
  LEAVE_APPROVED: "hr.leave.approved",

  // Transport
  VEHICLE_LOCATION_UPDATE: "transport.vehicle.location",
  TRIP_STARTED: "transport.trip.started",
  TRIP_ENDED: "transport.trip.ended",
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
