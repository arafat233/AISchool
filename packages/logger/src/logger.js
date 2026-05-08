"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createLogger = createLogger;
const winston = __importStar(require("winston"));
require("winston-daily-rotate-file");
const isDev = process.env.NODE_ENV === "development";
const consoleFormat = winston.format.combine(winston.format.colorize(), winston.format.timestamp({ format: "HH:mm:ss.SSS" }), winston.format.printf(({ level, message, timestamp, service, traceId, ...rest }) => {
    const svc = service ? `[${service}] ` : "";
    const trace = traceId ? ` (${traceId})` : "";
    const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : "";
    return `${timestamp} ${level} ${svc}${message}${trace}${meta}`;
}));
const jsonFormat = winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json());
function createLogger(service) {
    return winston.createLogger({
        level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
        defaultMeta: { service },
        transports: [
            new winston.transports.Console({
                format: isDev ? consoleFormat : jsonFormat,
            }),
            ...(isDev
                ? []
                : [
                    new winston.transports.DailyRotateFile({
                        filename: `logs/${service}-%DATE%.log`,
                        datePattern: "YYYY-MM-DD",
                        maxSize: "20m",
                        maxFiles: "14d",
                        format: jsonFormat,
                    }),
                ]),
        ],
    });
}
// Default app-level logger
exports.logger = createLogger("app");
//# sourceMappingURL=logger.js.map