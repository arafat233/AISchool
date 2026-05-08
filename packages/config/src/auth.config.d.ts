import { z } from "zod";
export declare const authEnvSchema: z.ZodObject<{
    JWT_ACCESS_SECRET: z.ZodString;
    JWT_REFRESH_SECRET: z.ZodString;
    JWT_ACCESS_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    JWT_REFRESH_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    TOTP_ISSUER: z.ZodDefault<z.ZodString>;
    GOOGLE_CLIENT_ID: z.ZodOptional<z.ZodString>;
    GOOGLE_CLIENT_SECRET: z.ZodOptional<z.ZodString>;
    GOOGLE_CALLBACK_URL: z.ZodOptional<z.ZodString>;
    MS_CLIENT_ID: z.ZodOptional<z.ZodString>;
    MS_CLIENT_SECRET: z.ZodOptional<z.ZodString>;
    MS_CALLBACK_URL: z.ZodOptional<z.ZodString>;
    AUTH_SERVICE_PORT: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_ACCESS_EXPIRES_IN: string;
    TOTP_ISSUER: string;
    AUTH_SERVICE_PORT: number;
    JWT_REFRESH_EXPIRES_IN: string;
    GOOGLE_CLIENT_ID?: string | undefined;
    GOOGLE_CLIENT_SECRET?: string | undefined;
    GOOGLE_CALLBACK_URL?: string | undefined;
    MS_CLIENT_ID?: string | undefined;
    MS_CLIENT_SECRET?: string | undefined;
    MS_CALLBACK_URL?: string | undefined;
}, {
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_ACCESS_EXPIRES_IN?: string | undefined;
    TOTP_ISSUER?: string | undefined;
    GOOGLE_CLIENT_ID?: string | undefined;
    GOOGLE_CLIENT_SECRET?: string | undefined;
    GOOGLE_CALLBACK_URL?: string | undefined;
    MS_CLIENT_ID?: string | undefined;
    MS_CLIENT_SECRET?: string | undefined;
    MS_CALLBACK_URL?: string | undefined;
    AUTH_SERVICE_PORT?: number | undefined;
    JWT_REFRESH_EXPIRES_IN?: string | undefined;
}>;
export type AuthEnv = z.infer<typeof authEnvSchema>;
//# sourceMappingURL=auth.config.d.ts.map