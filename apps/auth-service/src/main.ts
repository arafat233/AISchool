import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require("cookie-parser");

import { LoggerService } from "@school-erp/logger";
import { AllExceptionsFilter } from "@school-erp/utils";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.use(helmet());
  const logger = new LoggerService("AuthService");
  app.useLogger(logger);

  // Cookies (for HttpOnly refresh token)
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS â€” only allow configured frontend origin
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:3100",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  const port = process.env.AUTH_SERVICE_PORT ?? 3001;
  app.enableShutdownHooks();
  await app.listen(port);
  logger.log(`Auth service running on port ${port}`, "Bootstrap");
}

void bootstrap();
