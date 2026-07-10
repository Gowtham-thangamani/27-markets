import { Module } from '@nestjs/common';
import { EconomicCalendarController } from './economic-calendar.controller';
import { EconomicCalendarService } from './economic-calendar.service';

@Module({
  controllers: [EconomicCalendarController],
  providers: [EconomicCalendarService],
})
export class EconomicCalendarModule {}
