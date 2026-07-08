import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get('public')
  publicSettings() {
    return this.settings.publicSettings();
  }
}
