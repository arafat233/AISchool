import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
export declare const prisma: PrismaClient<{
    log: ("error" | "warn" | "info" | "query")[];
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    /**
     * Truncate all tables — only for use in test environments.
     */
    cleanDatabase(): Promise<void>;
}
//# sourceMappingURL=prisma.service.d.ts.map