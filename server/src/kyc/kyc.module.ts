import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { KycStorageService } from './storage';

@Module({
  controllers: [KycController],
  providers: [KycService, KycStorageService],
})
export class KycModule {}
