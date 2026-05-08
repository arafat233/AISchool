export declare class AppError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details?: unknown | undefined;
    constructor(code: string, message: string, statusCode?: number, details?: unknown | undefined);
    toJSON(): {
        details?: {} | undefined;
        code: string;
        message: any;
        statusCode: number;
    };
}
//# sourceMappingURL=base.error.d.ts.map