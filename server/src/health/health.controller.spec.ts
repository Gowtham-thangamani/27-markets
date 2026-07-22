import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: PrismaService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('SIMULATION'),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('reports ok', async () => {
    const result = await controller.check();
    expect(result.status).toBe('ok');
  });

  it('returns 503 (not 200) when the database is down', async () => {
    (prismaService.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('connection refused'));
    try {
      await controller.check();
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect((e as HttpException).getResponse()).toMatchObject({ status: 'degraded', db: 'down' });
    }
  });
});
