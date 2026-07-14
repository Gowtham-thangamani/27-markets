import { Inject, Injectable, Logger } from '@nestjs/common';
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

// Hosted on the frontend CDN (PNG for email-client compatibility). White logo on
// the dark header band, so it reads well in both light and dark email clients.
const EMAIL_LOGO_URL = 'https://27markets.com/email-logo.png';

const htmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const linkify = (s: string) =>
  s.replace(
    /(https?:\/\/[^\s]+)/g,
    (u) => `<a href="${u}" style="color:#e11d2e;word-break:break-all">${u}</a>`,
  );

/** Builds + sends the transactional onboarding emails from editable templates. */
@Injectable()
export class EmailService {
  private readonly logger = new Logger('Email');

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

  /** Wrap a plain-text body in the branded HTML shell (logo header + footer). */
  private wrapHtml(text: string): string {
    const body = htmlEscape(text)
      .split('\n')
      .map((line) =>
        line.trim() === ''
          ? ''
          : `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#20242c">${linkify(line)}</p>`,
      )
      .join('');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f2f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e9ee">
<tr><td align="center" style="background:#0d0f12;padding:26px 24px"><img src="${EMAIL_LOGO_URL}" alt="27 Markets" width="180" style="display:block;border:0;height:auto;width:180px;max-width:60%"></td></tr>
<tr><td style="padding:30px 32px 10px">${body}</td></tr>
<tr><td style="padding:0 32px 28px"><p style="margin:0;font-size:12px;line-height:1.6;color:#8a929d">This is an automated message from 27 Markets. Please do not reply to this email.</p></td></tr>
</table>
<p style="margin:16px 0 0;font-size:11px;color:#98a0ab">© 27 Markets · Trading involves risk.</p>
</td></tr></table></body></html>`;
  }

  /**
   * Deliver text + branded HTML together, logging the outcome of every attempt.
   * Failures are logged with the reason (e.g. an SES sandbox rejection) and then
   * re-thrown so callers keep their existing best-effort handling.
   */
  private async deliver(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.provider.send({ to, subject, text, html: this.wrapHtml(text) });
      this.logger.log(`email sent — to=${to} · "${subject}"`);
    } catch (err) {
      this.logger.error(`email FAILED — to=${to} · "${subject}": ${(err as Error).message}`);
      throw err;
    }
  }

  async sendVerifyEmail(to: string, token: string): Promise<void> {
    const link = `${this.origin()}/verify-email?token=${token}`;
    const { subject, text } = await this.render('verify_email', { link });
    return this.deliver(to, subject, text);
  }

  /** Nudge for users who registered but haven't verified their email yet. */
  async sendVerifyReminder(to: string, token: string): Promise<void> {
    const link = `${this.origin()}/verify-email?token=${token}`;
    const { subject, text } = await this.render('verify_reminder', { link });
    return this.deliver(to, subject, text);
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.origin()}/reset-password?token=${token}`;
    const { subject, text } = await this.render('password_reset', { link });
    return this.deliver(to, subject, text);
  }

  async sendWelcome(to: string, firstName: string): Promise<void> {
    const { subject, text } = await this.render('welcome', { firstName });
    return this.deliver(to, subject, text);
  }

  /** Security notification sent after a successful sign-in. */
  async sendLoginAlert(
    to: string,
    vars: { firstName: string; time: string; ip: string; device: string },
  ): Promise<void> {
    const { subject, text } = await this.render('login_alert', vars);
    return this.deliver(to, subject, text);
  }

  /** The 6-digit login verification code (email OTP second factor). */
  async sendLoginCode(to: string, code: string): Promise<void> {
    const { subject, text } = await this.render('login_code', { code });
    return this.deliver(to, subject, text);
  }

  /** Generic transactional notification email (mirrors an in-app notification). */
  async sendNotification(
    to: string,
    vars: { firstName: string; title: string; body: string },
  ): Promise<void> {
    const { subject, text } = await this.render('notification', vars);
    return this.deliver(to, subject, text);
  }
}
