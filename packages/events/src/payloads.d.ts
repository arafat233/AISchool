/** Base envelope for all Kafka messages */
export interface KafkaMessage<T = unknown> {
    eventId: string;
    eventType: string;
    tenantId: string;
    schoolId?: string;
    timestamp: string;
    version: "1.0";
    payload: T;
}
export interface UserCreatedPayload {
    userId: string;
    email: string;
    role: string;
    tenantId: string;
}
export interface SendNotificationPayload {
    to: string[];
    channel: "sms" | "email" | "push" | "whatsapp" | "in_app";
    templateId?: string;
    subject?: string;
    body: string;
    data?: Record<string, unknown>;
}
export interface FeePaymentReceivedPayload {
    paymentId: string;
    invoiceId: string;
    studentId: string;
    amount: number;
    mode: string;
    transactionId?: string;
}
export interface AttendanceMarkedPayload {
    sessionId: string;
    schoolId: string;
    date: string;
    absentStudentIds: string[];
    totalStudents: number;
    presentCount: number;
}
export interface VehicleLocationPayload {
    vehicleId: string;
    latitude: number;
    longitude: number;
    speed: number;
    timestamp: string;
    tripId?: string;
}
//# sourceMappingURL=payloads.d.ts.map