import { z } from "zod";
export declare const databaseEnvSchema: z.ZodObject<{
    DATABASE_URL: z.ZodString;
}, "strip", z.ZodTypeAny, {
    DATABASE_URL: string;
}, {
    DATABASE_URL: string;
}>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
//# sourceMappingURL=database.config.d.ts.map