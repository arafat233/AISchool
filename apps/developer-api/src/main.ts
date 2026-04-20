import { NestFactory, Reflector } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("DeveloperApi");
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? "").split(",").filter(Boolean),
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });
  app.setGlobalPrefix("v1");

  // ── Swagger / OpenAPI docs ───────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle("School ERP Developer API")
    .setDescription(
      "Public REST API for School ERP. Requires API key in `x-api-key` header.\n\n" +
      "Rate limits: Basic 100/min · Standard 300/min · Premium 1000/min · Enterprise 3000/min\n\n" +
      "Sandbox: use API keys prefixed with `sk_test_` — no real data modified."
    )
    .setVersion("1.0")
    .addApiKey({ type: "apiKey", in: "header", name: "x-api-key" }, "ApiKeyAuth")
    .addTag("Students", "Student CRUD and profile data")
    .addTag("Attendance", "Daily attendance records")
    .addTag("Fees", "Fee invoices and payments")
    .addTag("Webhooks", "Register and manage webhook endpoints")
    .addTag("Usage", "API key usage and rate limit stats")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.DEVELOPER_API_PORT ?? 3023;
  await app.listen(port);
  logger.log(`Listening on :${port} — docs: http://localhost:${port}/docs`);
}
bootstrap();
