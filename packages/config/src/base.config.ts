import { z } from "zod";

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

export function validateEnv<T>(schema: z.ZodSchema<T>, env: NodeJS.ProcessEnv = process.env): T {
  const result = schema.safeParse(env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }
  return result.data;
}
