import type { PaginatedResult, PaginationQuery } from "@school-erp/types";
export declare function parsePagination(query: PaginationQuery): {
    skip: number;
    take: number;
    page: number;
    limit: number;
};
export declare function buildPaginatedResult<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T>;
export declare function buildPrismaOrderBy(sortBy?: string, sortOrder?: "asc" | "desc"): Record<string, "asc" | "desc"> | undefined;
//# sourceMappingURL=pagination.d.ts.map