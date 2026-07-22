import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators';
import { KycVerificationService } from './kyc-verification.service';

/**
 * SumSub webhook receiver. Public (no JWT) but authenticated by SumSub's HMAC
 * signature over the RAW body (main.ts enables rawBody). Verdicts are applied
 * by KycVerificationService.applySumsubVerdict.
 */
@Controller('kyc/webhook')
export class SumsubWebhookController {
  constructor(private readonly verification: KycVerificationService) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(200)
  @Post('sumsub')
  async sumsub(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-payload-digest') digest?: string,
  ) {
    return this.verification.applySumsubVerdict(req.rawBody ?? Buffer.alloc(0), digest);
  }
}
