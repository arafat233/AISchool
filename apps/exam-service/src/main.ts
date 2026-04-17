import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { LoggerService } from "@school-erp/logger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(new LoggerService("ExamService"));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.EXAM_SERVICE_PORT ?? 3008);
}
void bootstrap();
