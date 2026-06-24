import 'reflect-metadata';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import type { Env } from './config/env.validation';

async function bootstrap(): Promise<void> {
  // rawBody: true exposes req.rawBody so the Stripe webhook can verify signatures.
  const app = await NestFactory.create(AppModule, { bufferLogs: false, rawBody: true });
  const config = app.get(ConfigService<Env, true>);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  // Security headers
  app.use(helmet());
  app.use(cookieParser());

  // CORS — allow the React client with credentials (cookies)
  app.enableCors({
    origin: config.get('CLIENT_ORIGIN', { infer: true }),
    credentials: true,
  });

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
  await app.listen(port);

  logger.log(`Apex Markets API listening on http://localhost:${port}/api`);
  logger.warn(`TRADING_MODE = ${mode}  (no real funds move while SIMULATION)`);
}

void bootstrap();
