import { AppError } from "./base.error";

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super("BAD_REQUEST", message, 400, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(retryAfterSeconds?: number) {
    super(
      "TOO_MANY_REQUESTS",
      `Rate limit exceeded${retryAfterSeconds ? `. Retry after ${retryAfterSeconds}s` : ""}`,
      429,
    );
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service?: string) {
    super(
      "SERVICE_UNAVAILABLE",
      service ? `${service} is currently unavailable` : "Service temporarily unavailable",
      503,
    );
  }
}
