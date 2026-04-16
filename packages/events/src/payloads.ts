/** Base envelope for all Kafka messages */
export interface KafkaMessage<T = unknown> {
  eventId: string;
  eventType: string;
  tenantId: string;
  schoolId?: string;
  timestamp: string;        // ISO 8601
  version: "1.0";
  payload: T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface UserCreatedPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────
export interface SendNotificationPayload {
  to: string[];             // userIds
  channel: "sms" | "email" | "push" | "whatsapp" | "in_app";
  templateId?: string;
  subject?: string;
  body: string;
  data?: Record<string, unknown>;
}

// ─── Fees ────────────────────────────────────────────────────────────────────
export interface FeePaymentReceivedPayload {
  paymentId: string;
  invoiceId: string;
  studentId: string;
  amount: number;            // paise
  mode: string;
  transactionId?: string;
}

// ─── Attendance ──────────────────────────────────────────────────────────────
export interface AttendanceMarkedPayload {
  sessionId: string;
  schoolId: string;
  date: string;
  absentStudentIds: string[];
  totalStudents: number;
  presentCount: number;
}

// ─── Transport ───────────────────────────────────────────────────────────────
export interface VehicleLocationPayload {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
  tripId?: string;
}
