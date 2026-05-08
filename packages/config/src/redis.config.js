"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisEnvSchema = void 0;
const zod_1 = require("zod");
exports.redisEnvSchema = zod_1.z.object({
    REDIS_HOST: zod_1.z.string().default("localhost"),
    REDIS_PORT: zod_1.z.coerce.number().default(6379),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    REDIS_URL: zod_1.z.string().default("redis://localhost:6379"),
});
//# sourceMappingURL=redis.config.js.map