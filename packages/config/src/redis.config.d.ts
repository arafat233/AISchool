import { z } from "zod";
export declare const redisEnvSchema: z.ZodObject<{
    REDIS_HOST: z.ZodDefault<z.ZodString>;
    REDIS_PORT: z.ZodDefault<z.ZodNumber>;
    REDIS_PASSWORD: z.ZodOptional<z.ZodString>;
    REDIS_URL: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    REDIS_HOST: string;
    REDIS_PORT: number;
    REDIS_URL: string;
    REDIS_PASSWORD?: string | undefined;
}, {
    REDIS_HOST?: string | undefined;
    REDIS_PORT?: number | undefined;
    REDIS_PASSWORD?: string | undefined;
    REDIS_URL?: string | undefined;
}>;
export type RedisEnv = z.infer<typeof redisEnvSchema>;
//# sourceMappingURL=redis.config.d.ts.map