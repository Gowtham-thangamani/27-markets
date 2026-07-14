import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from './auth.service';

/** Hourly job: email a one-time reminder to users who haven't verified yet (~24h). */
@Injectable()
export class VerifyReminderTask {
  private readonly logger = new Logger('VerifyReminder');

  constructor(private readonly auth: AuthService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run(): Promise<void> {
    try {
      const sent = await this.auth.remindUnverified();
      if (sent > 0) this.logger.log(`Sent ${sent} email-verification reminder(s).`);
    } catch (err) {
      this.logger.warn(`Verification-reminder run failed: ${(err as Error).message}`);
    }
  }
}
