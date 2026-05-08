"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseEnvSchema = void 0;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
exports.baseEnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
});
function validateEnv(schema, env = process.env) {
    const result = schema.safeParse(env);
    if (!result.success) {
        const formatted = result.error.issues
            .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
            .join("\n");
        throw new Error(`Invalid environment variables:\n${formatted}`);
    }
    return result.data;
}
//# sourceMappingURL=base.config.js.map