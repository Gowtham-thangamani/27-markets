import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_PROVIDER, type EmailProvider } from './email-provider';

interface TemplateCopy {
  subject: string;
  body: string;
}

// Hardcoded fallbacks — used if a template row is missing or the DB is unreachable,
// so onboarding email always sends. Bodies use {{placeholders}}.
const DEFAULTS: Record<string, TemplateCopy> = {
  verify_email: {
    subject: 'Verify your 27 Markets email',
    body: 'Welcome to 27 Markets.\n\nConfirm your email to activate your account:\n{{link}}\n\nThis link expires in 24 hours.',
  },
  password_reset: {
    subject: 'Reset your 27 Markets password',
    body: "We received a request to reset your password.\n\nSet a new password:\n{{link}}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.",
  },
  verify_reminder: {
    subject: 'Reminder: verify your 27 Markets email',
    body: "You signed up but haven't confirmed your email address yet.\n\nVerify now to fully secure your account:\n{{link}}\n\nThis link expires in 24 hours. If you didn't create this account, ignore this email.",
  },
  welcome: {
    subject: 'Welcome to 27 Markets',
    body: 'Hi {{firstName}},\n\nYour account is ready. A demo account has been created so you can start trading right away.',
  },
  login_alert: {
    subject: 'New sign-in to your 27 Markets account',
    body:
      'Hi {{firstName}},\n\nWe noticed a new sign-in to your account.\n\n' +
      'When: {{time}}\nIP address: {{ip}}\nDevice: {{device}}\n\n' +
      "If this was you, no action is needed. If you don't recognise this activity, " +
      'reset your password immediately and enable two-factor authentication.',
  },
  login_code: {
    subject: 'Your 27 Markets login code',
    body:
      'Your login verification code is:\n\n{{code}}\n\n' +
      "It expires in 10 minutes. If you didn't try to sign in, ignore this email and " +
      'consider changing your password.',
  },
  // Generic transactional notification (deposits, withdrawals, KYC, tickets, …).
  // Subject/body come from the event; admins can override this template per key.
  notification: {
    subject: '{{title}} — 27 Markets',
    body: 'Hi {{firstName}},\n\n{{body}}\n\nYou can review the details anytime in your 27 Markets portal.',
  },
};

/** Builds + sends the transactional onboarding emails from editable templates. */
@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  private origin(): string {
    return (this.config.get('CLIENT_ORIGIN', { infer: true }).split(',')[0] || '').trim() || 'http://localhost:5173';
  }

  private subst(text: string, vars: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');
  }

  /** Resolve a template by key (DB → fallback) and interpolate its variables. */
  private async render(key: string, vars: Record<string, string>): Promise<{ subject: string; text: string }> {
    let copy = DEFAULTS[key];
    try {
      const tpl = await this.prisma.notificationTemplate.findUnique({ where: { key } });
      if (tpl) copy = { subject: tpl.subject, body: tpl.body };
    } catch {
      // DB unreachable — keep the hardcoded fallback so email still sends.
    }
    return { subject: this.subst(copy.subject, vars), text: this.subst(copy.body, vars) };
  }

  async sendVerifyEmail(to: string, token: string): Promise<void> {
    const link = `${this.origin()}/verify-email?token=${token}`;
    const { subject, text } = await this.render('verify_email', { link });
    return this.provider.send({ to, subject, text });
  }

  /** Nudge for users who registered but haven't verified their email yet. */
  async sendVerifyReminder(to: string, token: string): Promise<void> {
    const link = `${this.origin()}/verify-email?token=${token}`;
    const { subject, text } = await this.render('verify_reminder', { link });
    return this.provider.send({ to, subject, text });
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.origin()}/reset-password?token=${token}`;
    const { subject, text } = await this.render('password_reset', { link });
    return this.provider.send({ to, subject, text });
  }

  async sendWelcome(to: string, firstName: string): Promise<void> {
    const { subject, text } = await this.render('welcome', { firstName });
    return this.provider.send({ to, subject, text });
  }

  /** Security notification sent after a successful sign-in. */
  async sendLoginAlert(
    to: string,
    vars: { firstName: string; time: string; ip: string; device: string },
  ): Promise<void> {
    const { subject, text } = await this.render('login_alert', vars);
    return this.provider.send({ to, subject, text });
  }

  /** The 6-digit login verification code (email OTP second factor). */
  async sendLoginCode(to: string, code: string): Promise<void> {
    const { subject, text } = await this.render('login_code', { code });
    return this.provider.send({ to, subject, text });
  }

  /** Generic transactional notification email (mirrors an in-app notification). */
  async sendNotification(
    to: string,
    vars: { firstName: string; title: string; body: string },
  ): Promise<void> {
    const { subject, text } = await this.render('notification', vars);
    return this.provider.send({ to, subject, text });
  }
}
