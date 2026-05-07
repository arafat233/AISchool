import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { LoggerService } from '@school-erp/logger';
import { PROXY_ROUTES } from './proxy/proxy.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false,
    bufferLogs: true,
  });

  const logger = new LoggerService('ApiGateway');
  app.useLogger(logger);

  const expressApp = app.getHttpAdapter().getInstance();

  for (const route of PROXY_ROUTES) {
    expressApp.use(
      route.prefix,
      createProxyMiddleware({
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

  app.enableCors({
    origin: process.env['CORS_ORIGINS']?.split(',') ?? true,
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  logger.log(`API Gateway running on port ${port}`, 'Bootstrap');
}

void bootstrap();
