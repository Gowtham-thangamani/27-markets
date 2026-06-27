import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Email transport seam. ConsoleEmailProvider (dev) logs the message so flows are
 * fully testable with no external service; a real provider (SMTP/Resend/SES)
 * plugs in behind the same interface at go-live — selected by EMAIL_PROVIDER.
 */
export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<void>;
}

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  private readonly log = new Logger('Email');

  async send(msg: EmailMessage): Promise<void> {
    this.log.log(`✉️  to=${msg.to} · ${msg.subject}\n${msg.text}`);
  }
}

/** Placeholder for a real provider (SMTP/Resend/SES). Refuses until configured. */
@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  constructor(private readonly config: ConfigService<Env, true>) {}

  async send(): Promise<void> {
    // TODO(go-live): send via the configured SMTP/Resend/SES credentials.
    void this.config;
    throw new NotImplementedException('SMTP email provider is not configured.');
  }
}
