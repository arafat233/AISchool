import { AppError } from "./base.error";
export declare class BadRequestError extends AppError {
    constructor(message: string, details?: unknown);
}
export declare class TooManyRequestsError extends AppError {
    constructor(retryAfterSeconds?: number);
}
export declare class ServiceUnavailableError extends AppError {
    constructor(service?: string);
}
//# sourceMappingURL=http.errors.d.ts.map