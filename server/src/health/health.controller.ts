import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators';
import type { Env } from '../config/env.validation';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Get()
  async check() {
    let db = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }

    const body = {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      tradingMode: this.config.get('TRADING_MODE', { infer: true }),
      time: new Date().toISOString(),
    };

    // A load balancer keys readiness on the HTTP status, not the JSON body — so a
    // DB-down instance must return 503, or traffic keeps routing to a dead node.
    if (db !== 'up') {
      throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return body;
  }
}
