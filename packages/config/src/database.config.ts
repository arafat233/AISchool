import { z } from "zod";

export const databaseEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .startsWith("postgresql://", "DATABASE_URL must start with postgresql://"),
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
