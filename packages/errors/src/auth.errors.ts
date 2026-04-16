import { AppError } from "./base.error";

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message, 403);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super("INVALID_CREDENTIALS", "Invalid email or password", 401);
  }
}

export class TokenExpiredError extends AppError {
  constructor() {
    super("TOKEN_EXPIRED", "Token has expired", 401);
  }
}

export class InvalidTokenError extends AppError {
  constructor() {
    super("INVALID_TOKEN", "Invalid token", 401);
  }
}

export class TwoFactorRequiredError extends AppError {
  constructor() {
    super("2FA_REQUIRED", "Two-factor authentication required", 403);
  }
}

export class InvalidOtpError extends AppError {
  constructor() {
    super("INVALID_OTP", "Invalid or expired OTP", 401);
  }
}

export class AccountDisabledError extends AppError {
  constructor() {
    super("ACCOUNT_DISABLED", "Your account has been disabled", 403);
  }
}

export class PlanUpgradeRequiredError extends AppError {
  constructor(requiredPlan: string) {
    super("PLAN_UPGRADE_REQUIRED", `This feature requires the ${requiredPlan} plan`, 402);
  }
}
