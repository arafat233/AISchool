import { z } from "zod";

export const redisEnvSchema = z.object({
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
});

export type RedisEnv = z.infer<typeof redisEnvSchema>;
