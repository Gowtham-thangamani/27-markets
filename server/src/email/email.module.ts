import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { EMAIL_PROVIDER, ConsoleEmailProvider, SmtpEmailProvider, type EmailProvider } from './email-provider';
import { EmailService } from './email.service';

/** Global so any module can send transactional email. Provider chosen by EMAIL_PROVIDER. */
@Global()
@Module({
  providers: [
    ConsoleEmailProvider,
    SmtpEmailProvider,
    EmailService,
    {
      provide: EMAIL_PROVIDER,
      inject: [ConfigService, ConsoleEmailProvider, SmtpEmailProvider],
      useFactory: (config: ConfigService<Env, true>, console: ConsoleEmailProvider, smtp: SmtpEmailProvider): EmailProvider =>
        config.get('EMAIL_PROVIDER', { infer: true }) === 'smtp' ? smtp : console,
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
