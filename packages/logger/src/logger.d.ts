import * as winston from "winston";
import "winston-daily-rotate-file";
export interface LogContext {
    service?: string;
    traceId?: string;
    userId?: string;
    tenantId?: string;
    method?: string;
    url?: string;
    statusCode?: number;
    duration?: number;
    [key: string]: unknown;
}
export declare function createLogger(service: string): winston.Logger;
export declare const logger: winston.Logger;
//# sourceMappingURL=logger.d.ts.map