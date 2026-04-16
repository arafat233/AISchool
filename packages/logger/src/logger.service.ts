import { Injectable, LoggerService as NestLoggerService } from "@nestjs/common";

import { createLogger } from "./logger";

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger;

  constructor(context?: string) {
    this.logger = createLogger(context ?? "NestJS");
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
