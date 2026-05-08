import { AppError } from "./base.error";
export declare class NotFoundError extends AppError {
    constructor(resource: string, id?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: unknown);
}
export declare class BusinessRuleError extends AppError {
    constructor(code: string, message: string);
}
export declare class TenantMismatchError extends AppError {
    constructor();
}
//# sourceMappingURL=domain.errors.d.ts.map