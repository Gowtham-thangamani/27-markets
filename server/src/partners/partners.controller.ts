import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators';
import { PartnersService } from './partners.service';
import { ApplyPartnerDto } from './dto';

@Controller('partners')
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('apply')
  apply(@Body() dto: ApplyPartnerDto) {
    return this.partners.apply(dto);
  }
}
