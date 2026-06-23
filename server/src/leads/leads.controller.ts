import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LeadsService } from './leads.service';
import { CaptureLeadDto } from './dto';
import { Public } from '../common/decorators';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  /** Public prospect capture (demo request / contact form). Rate-limited. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post()
  capture(@Body() dto: CaptureLeadDto) {
    return this.leads.capture(dto);
  }
}
