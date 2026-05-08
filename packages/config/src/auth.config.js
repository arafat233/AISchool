"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authEnvSchema = void 0;
const zod_1 = require("zod");
exports.authEnvSchema = zod_1.z.object({
    JWT_ACCESS_SECRET: zod_1.z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default("7d"),
    TOTP_ISSUER: zod_1.z.string().default("SchoolERP"),
    GOOGLE_CLIENT_ID: zod_1.z.string().optional(),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional(),
    GOOGLE_CALLBACK_URL: zod_1.z.string().url().optional(),
    MS_CLIENT_ID: zod_1.z.string().optional(),
    MS_CLIENT_SECRET: zod_1.z.string().optional(),
    MS_CALLBACK_URL: zod_1.z.string().url().optional(),
    AUTH_SERVICE_PORT: zod_1.z.coerce.number().default(3001),
});
//# sourceMappingURL=auth.config.js.map