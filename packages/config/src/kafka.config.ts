import { z } from "zod";

export const kafkaEnvSchema = z.object({
  KAFKA_BROKERS: z.string().default("localhost:9092"),
  KAFKA_CLIENT_ID: z.string().default("school-erp"),
  KAFKA_GROUP_ID: z.string().default("school-erp-group"),
});

export type KafkaEnv = z.infer<typeof kafkaEnvSchema>;
