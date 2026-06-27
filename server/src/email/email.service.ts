import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { EMAIL_PROVIDER, type EmailProvider } from './email-provider';

/** Builds + sends the transactional onboarding emails. */
@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private origin(): string {
    return (this.config.get('CLIENT_ORIGIN', { infer: true }).split(',')[0] || '').trim() || 'http://localhost:5173';
  }

  sendVerifyEmail(to: string, token: string): Promise<void> {
    const link = `${this.origin()}/verify-email?token=${token}`;
    return this.provider.send({
      to,
      subject: 'Verify your 27 Markets email',
      text: `Welcome to 27 Markets.\n\nConfirm your email to activate your account:\n${link}\n\nThis link expires in 24 hours.`,
    });
  }

  sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.origin()}/reset-password?token=${token}`;
    return this.provider.send({
      to,
      subject: 'Reset your 27 Markets password',
      text: `We received a request to reset your password.\n\nSet a new password:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
    });
  }

  sendWelcome(to: string, firstName: string): Promise<void> {
    return this.provider.send({
      to,
      subject: 'Welcome to 27 Markets',
      text: `Hi ${firstName},\n\nYour account is ready. A demo account has been created so you can start trading right away.`,
    });
  }
}
