"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePagination = parsePagination;
exports.buildPaginatedResult = buildPaginatedResult;
exports.buildPrismaOrderBy = buildPrismaOrderBy;
function parsePagination(query) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    return { skip: (page - 1) * limit, take: limit, page, limit };
}
function buildPaginatedResult(data, total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
}
function buildPrismaOrderBy(sortBy, sortOrder = "asc") {
    if (!sortBy)
        return undefined;
    return { [sortBy]: sortOrder };
}
//# sourceMappingURL=pagination.js.map