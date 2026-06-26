import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import {
  STORAGE_PROVIDER,
  LocalStorageProvider,
  S3StorageProvider,
  type StorageProvider,
} from './storage-provider';

@Module({
  controllers: [KycController],
  providers: [
    KycService,
    LocalStorageProvider,
    S3StorageProvider,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService, LocalStorageProvider, S3StorageProvider],
      useFactory: (
        config: ConfigService<Env, true>,
        local: LocalStorageProvider,
        s3: S3StorageProvider,
      ): StorageProvider => (config.get('STORAGE_PROVIDER', { infer: true }) === 's3' ? s3 : local),
    },
  ],
})
export class KycModule {}
