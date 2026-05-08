import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { LoggerService } from "@school-erp/logger";
import { AllExceptionsFilter } from "@school-erp/utils";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(helmet());
  app.useLogger(new LoggerService("HrService"));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: process.env.FRONTEND_URL || "http://localhost:3100", credentials: true, methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"] });
  app.enableShutdownHooks();
  await app.listen(process.env.HR_SERVICE_PORT ?? 3010);
}
void bootstrap();
