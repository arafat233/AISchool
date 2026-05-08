import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { LoggerService } from '@school-erp/logger';
import { AllExceptionsFilter } from '@school-erp/utils';
import { PROXY_ROUTES } from './proxy/proxy.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false,
    bufferLogs: true,
  });

  app.use(helmet());
  const logger = new LoggerService('ApiGateway');
  app.useLogger(logger);
  app.useGlobalFilters(new AllExceptionsFilter());

  const expressApp = app.getHttpAdapter().getInstance();

  for (const route of PROXY_ROUTES) {
    // Use pathFilter at root level so Express does NOT strip the prefix before forwarding.
    // expressApp.use(prefix, ...) strips the prefix; pathFilter preserves it.
    expressApp.use(
      createProxyMiddleware({
        pathFilter: route.prefix,
        target: route.target,
        changeOrigin: true,
        ...(route.pathRewrite ? { pathRewrite: route.pathRewrite } : {}),
        on: {
          error: (err: Error, req: import('express').Request, res: import('express').Response) => {
            logger.error(`Proxy error for ${route.prefix}: ${err.message}`, 'Proxy');
            (res as import('express').Response & { status: (code: number) => { json: (body: unknown) => void } })
              .status(502)
              .json({ statusCode: 502, message: 'Service unavailable' });
          },
          proxyReq: (_proxyReq: unknown, req: import('express').Request) => {
            logger.log(`${req.method} ${req.url} → ${route.target}`, 'Proxy');
          },
        },
      }),
    );
  }

  const defaultOrigins = 'http://localhost:4000,http://localhost:4001,http://localhost:4002,http://localhost:4003,http://localhost:4004';
  const allowedOrigins = (process.env['CORS_ORIGINS'] ?? defaultOrigins).split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const port = process.env['PORT'] ?? 3000;
  app.enableShutdownHooks();
  await app.listen(port);
  logger.log(`API Gateway running on port ${port}`, 'Bootstrap');
}

void bootstrap();
