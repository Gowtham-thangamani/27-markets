import 'reflect-metadata';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { initSentry } from './observability/sentry';
import type { Env } from './config/env.validation';

async function bootstrap(): Promise<void> {
  // Error tracking — no-op unless SENTRY_DSN is set. Init before anything else.
  initSentry();

  // rawBody: true exposes req.rawBody so the Stripe webhook can verify signatures.
  const app = await NestFactory.create(AppModule, { bufferLogs: false, rawBody: true });
  const config = app.get(ConfigService<Env, true>);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  // Security headers
  app.use(helmet());
  app.use(cookieParser());

  // CORS — allow the React client(s) with credentials (cookies).
  // In development, reflect any origin (so localhost + any LAN IP/device work,
  // even when the IP changes). In production, lock to the CLIENT_ORIGIN list.
  const isDev = config.get('NODE_ENV', { infer: true }) !== 'production';

  // In production the API sits behind a proxy/load-balancer (Render). Trust the
  // first hop so req.ip — used for rate-limit keys and audit logging — reflects
  // the real client via X-Forwarded-For, not the proxy. Bump the count if you
  // add another proxy layer in front (e.g. Cloudflare). Dev has no proxy.
  if (!isDev) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  const origins = config
    .get('CLIENT_ORIGIN', { infer: true })
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: isDev ? true : origins, credentials: true });

  // Reject unknown/invalid payloads everywhere
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  const mode = config.get('TRADING_MODE', { infer: true });
  await app.listen(port, '0.0.0.0');

  logger.log(`Apex Markets API listening on http://localhost:${port}/api`);
  logger.warn(`TRADING_MODE = ${mode}  (no real funds move while SIMULATION)`);
}

void bootstrap();
