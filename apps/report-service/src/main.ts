import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3021;
  await app.listen(port);
  console.log(`[report-service] listening on port ${port}`);
}
bootstrap();
