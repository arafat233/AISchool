import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

export async function createTestApp(module: Parameters<typeof Test.createTestingModule>[0]): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule(module).compile();
  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  return app;
}

export function mockJwtPayload(override: Record<string, unknown> = {}) {
  return {
    sub: "user-test-id",
    email: "test@example.com",
    role: "TEACHER",
    tenantId: "tenant-test-id",
    plan: "STANDARD",
    ...override,
  };
}
