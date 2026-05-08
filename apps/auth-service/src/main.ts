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

  const devOrigins = [
    'http://localhost:3100',
    'http://localhost:3101',
    'http://localhost:3102',
    'http://localhost:3103',
    'http://localhost:3104',
  ];
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
    : devOrigins;
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const port = process.env.AUTH_SERVICE_PORT ?? 3001;
  app.enableShutdownHooks();
  await app.listen(port);
  logger.log(`Auth service running on port ${port}`, "Bootstrap");
}

void bootstrap();
