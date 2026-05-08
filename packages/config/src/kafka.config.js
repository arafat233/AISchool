"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kafkaEnvSchema = void 0;
const zod_1 = require("zod");
exports.kafkaEnvSchema = zod_1.z.object({
    KAFKA_BROKERS: zod_1.z.string().default("localhost:9092"),
    KAFKA_CLIENT_ID: zod_1.z.string().default("school-erp"),
    KAFKA_GROUP_ID: zod_1.z.string().default("school-erp-group"),
});
//# sourceMappingURL=kafka.config.js.map