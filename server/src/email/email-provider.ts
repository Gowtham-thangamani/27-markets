import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
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

/**
 * Real SMTP transport (nodemailer). Activated by EMAIL_PROVIDER=smtp; reads
 * SMTP_HOST/PORT/SECURE/USER/PASS and sends from EMAIL_FROM. The transporter is
 * created lazily and reused across sends.
 */
@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  private readonly log = new Logger('Email');
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  private transport(): Transporter {
    if (this.transporter) return this.transporter;
    const host = this.config.get('SMTP_HOST', { infer: true });
    if (!host) {
      throw new Error('EMAIL_PROVIDER=smtp but SMTP_HOST is not configured.');
    }
    const user = this.config.get('SMTP_USER', { infer: true });
    const pass = this.config.get('SMTP_PASS', { infer: true });
    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get('SMTP_PORT', { infer: true }),
      secure: this.config.get('SMTP_SECURE', { infer: true }),
      auth: user && pass ? { user, pass } : undefined,
    });
    return this.transporter;
  }

  async send(msg: EmailMessage): Promise<void> {
    const from = this.config.get('EMAIL_FROM', { infer: true });
    await this.transport().sendMail({ from, to: msg.to, subject: msg.subject, text: msg.text });
    this.log.log(`✉️  sent to=${msg.to} · ${msg.subject}`);
  }
}
