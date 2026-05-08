import { z } from "zod";
export declare const kafkaEnvSchema: z.ZodObject<{
    KAFKA_BROKERS: z.ZodDefault<z.ZodString>;
    KAFKA_CLIENT_ID: z.ZodDefault<z.ZodString>;
    KAFKA_GROUP_ID: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    KAFKA_BROKERS: string;
    KAFKA_CLIENT_ID: string;
    KAFKA_GROUP_ID: string;
}, {
    KAFKA_BROKERS?: string | undefined;
    KAFKA_CLIENT_ID?: string | undefined;
    KAFKA_GROUP_ID?: string | undefined;
}>;
export type KafkaEnv = z.infer<typeof kafkaEnvSchema>;
//# sourceMappingURL=kafka.config.d.ts.map