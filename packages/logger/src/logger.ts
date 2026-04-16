import * as winston from "winston";
import "winston-daily-rotate-file";

export interface LogContext {
  service?: string;
  traceId?: string;
  userId?: string;
  tenantId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV === "development";

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss.SSS" }),
  winston.format.printf(({ level, message, timestamp, service, traceId, ...rest }) => {
    const svc = service ? `[${service}] ` : "";
    const trace = traceId ? ` (${traceId})` : "";
    const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : "";
    return `${timestamp} ${level} ${svc}${message}${trace}${meta}`;
  }),
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export function createLogger(service: string): winston.Logger {
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
export const logger = createLogger("app");
