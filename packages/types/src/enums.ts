// Mirror of Prisma enums — for use in frontend/shared code without importing @prisma/client

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  ACCOUNTANT = "ACCOUNTANT",
  TEACHER = "TEACHER",
  CLASS_TEACHER = "CLASS_TEACHER",
  SUBJECT_TEACHER = "SUBJECT_TEACHER",
  LIBRARIAN = "LIBRARIAN",
  TRANSPORT_MANAGER = "TRANSPORT_MANAGER",
  HR_MANAGER = "HR_MANAGER",
  RECEPTIONIST = "RECEPTIONIST",
  NURSE = "NURSE",
  STUDENT = "STUDENT",
  PARENT = "PARENT",
  DRIVER = "DRIVER",
  SECURITY = "SECURITY",
  IT_ADMIN = "IT_ADMIN",
  PRINCIPAL = "PRINCIPAL",
  VICE_PRINCIPAL = "VICE_PRINCIPAL",
}

export enum SubscriptionPlan {
  FREE = "FREE",
  BASIC = "BASIC",
  STANDARD = "STANDARD",
  PREMIUM = "PREMIUM",
  ENTERPRISE = "ENTERPRISE",
}

export enum AttendanceStatus {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",
  LATE = "LATE",
  HALF_DAY = "HALF_DAY",
  ON_LEAVE = "ON_LEAVE",
  HOLIDAY = "HOLIDAY",
}

export enum FeeInvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
  WAIVED = "WAIVED",
}

export enum PaymentMode {
  CASH = "CASH",
  CHEQUE = "CHEQUE",
  ONLINE = "ONLINE",
  UPI = "UPI",
  NEFT = "NEFT",
  RTGS = "RTGS",
  DD = "DD",
}

export enum LeaveStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}
