import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import * as cookieParser from "cookie-parser";

import { LoggerService } from "@school-erp/logger";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

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

  // CORS — only allow configured frontend origin
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:3100",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  const port = process.env.AUTH_SERVICE_PORT ?? 3001;
  await app.listen(port);
  logger.log(`Auth service running on port ${port}`, "Bootstrap");
}

void bootstrap();
