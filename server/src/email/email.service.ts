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

  /**
   * Render a plain-text body into a polished, branded HTML email: logo header ·
   * a heading (from the subject) · styled paragraphs, with standalone links turned
   * into action buttons and 6-digit codes into a highlighted box · footer.
   * Table-based + inline styles for email-client compatibility.
   */
  private wrapHtml(subject: string, text: string): string {
    const heading = htmlEscape(subject.replace(/\s*[—–-]\s*27 Markets\s*$/i, '').trim());
    const ctaLabel = /verif/i.test(subject)
      ? 'Verify email'
      : /reset|password/i.test(subject)
        ? 'Reset password'
        : 'Open 27 Markets';

    // Build content blocks, grouping consecutive "Label: value" lines (e.g. a
    // login alert's When/IP/Device, or a transaction's amount/reference) into a
    // clean details card.
    const lines = text.split('\n');
    const kv = /^([A-Za-z][\w .()/-]{0,28}):\s+(.+)$/;
    const parts: string[] = [];
    let i = 0;
    let preheader = '';
    while (i < lines.length) {
      const line = lines[i].trim();
      if (line === '') { i++; continue; }
      if (!preheader && !/^hi\b/i.test(line)) preheader = line;
      if (kv.test(line)) {
        const rows: string[] = [];
        while (i < lines.length && kv.test(lines[i].trim())) {
          const m = lines[i].trim().match(kv)!;
          rows.push(`<tr><td style="padding:9px 0;font-size:13px;color:#8a929d;white-space:nowrap;vertical-align:top">${htmlEscape(m[1])}</td><td style="padding:9px 0 9px 18px;font-size:14px;color:#20242c;font-weight:600;text-align:right">${htmlEscape(m[2])}</td></tr>`);
          i++;
        }
        parts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;background:#f7f8fa;border:1px solid #ecf0f4;border-radius:12px"><tr><td style="padding:8px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join('')}</table></td></tr></table>`);
        continue;
      }
      if (/^https?:\/\/\S+$/.test(line)) {
        parts.push(`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0 16px"><tr><td style="border-radius:9px;background:#e11d2e;box-shadow:0 4px 12px -3px rgba(225,29,46,.45)"><a href="${line}" style="display:inline-block;padding:14px 34px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:9px">${ctaLabel}</a></td></tr></table>
<p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:#98a0ab">Or paste this link into your browser:<br><a href="${line}" style="color:#e11d2e;word-break:break-all">${line}</a></p>`);
        i++;
        continue;
      }
      if (/^\d{6}$/.test(line)) {
        parts.push(`<div style="margin:10px 0 20px;padding:20px;background:#0d0f12;border-radius:12px;text-align:center;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:12px;color:#ffffff">${line}</div>`);
        i++;
        continue;
      }
      parts.push(`<p style="margin:0 0 15px;font-size:15px;line-height:1.65;color:#2a2f38">${linkify(htmlEscape(line))}</p>`);
      i++;
    }
    const blocks = parts.join('');
    const year = new Date().getFullYear();
    const S = 'https://27markets.com';
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#eceff3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${htmlEscape(preheader).slice(0, 140)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceff3;padding:30px 12px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e6ec">
<tr><td align="center" style="background:linear-gradient(180deg,#171a20 0%,#0b0d10 100%);background-color:#0d0f12;padding:30px 24px 22px">
<img src="${EMAIL_LOGO_URL}" alt="27 Markets" width="168" style="display:block;border:0;height:auto;width:168px;max-width:56%">
<div style="margin-top:12px;font-size:10px;letter-spacing:3px;color:#7b8494;text-transform:uppercase">Trade Beyond Limits</div></td></tr>
<tr><td style="height:4px;background:#e11d2e;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:36px 38px 8px">${heading ? `<h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;font-weight:700;color:#0d0f12;letter-spacing:-.01em">${heading}</h1>` : ''}${blocks}</td></tr>
<tr><td style="padding:8px 38px 30px">
<hr style="border:none;border-top:1px solid #edf0f4;margin:12px 0 18px">
<p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:#98a0ab">This is an automated message from 27 Markets — please do not reply. Need help? Contact <a href="mailto:info@27markets.com" style="color:#e11d2e;text-decoration:none">info@27markets.com</a>.</p>
<p style="margin:0;font-size:12px"><a href="${S}/faq" style="color:#7b8494;text-decoration:none">Help Center</a> &nbsp;·&nbsp; <a href="${S}/legal/privacy" style="color:#7b8494;text-decoration:none">Privacy</a> &nbsp;·&nbsp; <a href="${S}/legal/client-agreement" style="color:#7b8494;text-decoration:none">Terms</a></p></td></tr>
</table>
<p style="margin:20px 0 0;font-size:11px;line-height:1.6;color:#9aa2ad;max-width:520px">© ${year} 27 Markets. All rights reserved.<br>Trading involves significant risk of loss and may not be suitable for all investors.</p>
</td></tr></table></body></html>`;
  }

  /**
   * Deliver text + branded HTML together, logging the outcome of every attempt.
   * Failures are logged with the reason (e.g. an SES sandbox rejection) and then
   * re-thrown so callers keep their existing best-effort handling.
   */
  private async deliver(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.provider.send({ to, subject, text, html: this.wrapHtml(subject, text) });
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
