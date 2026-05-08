import { AppError } from "./base.error";
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class InvalidCredentialsError extends AppError {
    constructor();
}
export declare class TokenExpiredError extends AppError {
    constructor();
}
export declare class InvalidTokenError extends AppError {
    constructor();
}
export declare class TwoFactorRequiredError extends AppError {
    constructor();
}
export declare class InvalidOtpError extends AppError {
    constructor();
}
export declare class AccountDisabledError extends AppError {
    constructor();
}
export declare class PlanUpgradeRequiredError extends AppError {
    constructor(requiredPlan: string);
}
//# sourceMappingURL=auth.errors.d.ts.map