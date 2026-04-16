import { AppError } from "./base.error";

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const msg = id ? `${resource} with id "${id}" not found` : `${resource} not found`;
    super("NOT_FOUND", msg, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 422, details);
  }
}

export class BusinessRuleError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 422);
  }
}

export class TenantMismatchError extends AppError {
  constructor() {
    super("TENANT_MISMATCH", "Resource does not belong to your tenant", 403);
  }
}
