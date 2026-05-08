"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseEnvSchema = void 0;
const zod_1 = require("zod");
exports.databaseEnvSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z
        .string()
        .url()
        .startsWith("postgresql://", "DATABASE_URL must start with postgresql://"),
});
//# sourceMappingURL=database.config.js.map