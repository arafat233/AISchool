import { z } from "zod";
export declare const baseEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<unknown[]>>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV?: unknown;
}, {
    NODE_ENV?: unknown;
}>;
export type BaseEnv = z.infer<typeof baseEnvSchema>;
export declare function validateEnv<T>(schema: z.ZodSchema<T>, env?: NodeJS.ProcessEnv): T;
//# sourceMappingURL=base.config.d.ts.map