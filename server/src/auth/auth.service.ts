import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { AccountType, AccountMode, VerificationTokenType, type User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CryptoService } from '../common/crypto.service';
import { EmailService } from '../email/email.service';
import { AccountsService } from '../accounts/accounts.service';
import { LeadsService } from '../leads/leads.service';
import { TokensService } from './tokens.service';
import { RegisterDto, LoginDto, DisableTwoFactorDto } from './dto';
import type { Env } from '../config/env.validation';

export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

/** Brute-force lockout: lock an account after this many consecutive failures… */
const MAX_FAILED_ATTEMPTS = 5;
/** …for this long (15 minutes). */
const LOCKOUT_MS = 15 * 60 * 1000;

/** Email login OTP: how long a code is valid. */
const LOGIN_OTP_TTL_MS = 10 * 60 * 1000;
/** Max wrong guesses before the code is burned and a new one must be requested. */
const LOGIN_OTP_MAX_ATTEMPTS = 5;
/** Don't send a fresh code more than once per this window (anti email-spam). */
const LOGIN_OTP_RESEND_MS = 45 * 1000;

/**
 * Mask an email before it enters the (unauthenticated) audit sink. A value that
 * doesn't look like an email — e.g. a password accidentally typed into the email
 * field — is redacted entirely rather than stored verbatim.
 */
function maskEmail(value: string): string {
  const m = /^([^@\s])[^@\s]*(@.+)$/.exec(value);
  return m ? `${m[1]}***${m[2]}` : '[redacted]';
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly audit: AuditService,
    private readonly leads: LeadsService,
    private readonly config: ConfigService<Env, true>,
    private readonly crypto: CryptoService,
    private readonly email: EmailService,
    private readonly accounts: AccountsService,
  ) {}

  // ── Verification / reset tokens (raw emailed, only the hash stored) ──
  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async issueVerificationToken(userId: string, type: VerificationTokenType, ttlMs: number): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    await this.prisma.verificationToken.create({
      data: { userId, type, tokenHash: this.hashToken(raw), expiresAt: new Date(Date.now() + ttlMs) },
    });
    return raw;
  }

  private async consumeToken(raw: string, type: VerificationTokenType | VerificationTokenType[]) {
    const token = await this.prisma.verificationToken.findFirst({
      where: { tokenHash: this.hashToken(raw), type: Array.isArray(type) ? { in: type } : type },
    });
    if (!token || token.usedAt || token.expiresAt < new Date()) {
      throw new BadRequestException('This link is invalid or has expired.');
    }
    await this.prisma.verificationToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
    return token;
  }

  /** A TOTP code is a replay if its time-step was already accepted. */
  static isTotpReplay(step: number, lastStep: number | null | undefined): boolean {
    return lastStep != null && step <= lastStep;
  }

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      emailVerified: user.emailVerified,
    };
  }

  async register(dto: RegisterDto, ctx: RequestContext): Promise<{ user: PublicUser; tokens: IssuedTokens }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const referredByPartnerId = dto.ref
      ? (await this.prisma.partnerProfile.findUnique({ where: { referralCode: dto.ref.toUpperCase() } }))?.userId ?? null
      : null;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        country: dto.country,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        acceptedTermsAt: new Date(),
        referredByPartnerId,
        kycProfile: { create: {} },
      },
    });

    // Connect the acquisition funnel: convert a matching prospect (or record one).
    await this.leads.convertOnRegister(user.id, {
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone ?? undefined,
      country: user.country ?? undefined,
    });

    // Give new users a demo account so they can trade immediately.
    await this.accounts.create(user.id, AccountType.STANDARD, AccountMode.DEMO).catch(() => undefined);

    // Send the verification email (non-blocking for the signup response).
    const verifyToken = await this.issueVerificationToken(user.id, VerificationTokenType.EMAIL_VERIFY, 24 * 60 * 60 * 1000);
    await this.email.sendVerifyEmail(user.email, verifyToken).catch(() => undefined);
    await this.email.sendWelcome(user.email, user.firstName).catch(() => undefined);

    const tokens = await this.issueSession(user, ctx);
    await this.audit.record({ userId: user.id, action: 'auth.register', entity: 'User', entityId: user.id, ...ctx });
    return { user: this.toPublic(user), tokens };
  }

  /** Confirm an email-verification token. */
  async verifyEmail(rawToken: string) {
    const token = await this.consumeToken(rawToken, VerificationTokenType.EMAIL_VERIFY);
    await this.prisma.user.update({ where: { id: token.userId }, data: { emailVerified: true } });
    await this.audit.record({ userId: token.userId, action: 'auth.email.verified', entity: 'User', entityId: token.userId });
    return { ok: true };
  }

  /** Re-send the verification email to a signed-in, still-unverified user. */
  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerified) return { ok: true, alreadyVerified: true };
    const token = await this.issueVerificationToken(user.id, VerificationTokenType.EMAIL_VERIFY, 24 * 60 * 60 * 1000);
    await this.email.sendVerifyEmail(user.email, token);
    return { ok: true };
  }

  /** Start a password reset. Always resolves (no account enumeration). */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      const token = await this.issueVerificationToken(user.id, VerificationTokenType.PASSWORD_RESET, 60 * 60 * 1000);
      await this.email.sendPasswordReset(user.email, token).catch(() => undefined);
    }
    return { ok: true };
  }

  /** Complete a password reset and invalidate existing sessions. Also accepts PARTNER_INVITE tokens. */
  async resetPassword(rawToken: string, newPassword: string) {
    const token = await this.consumeToken(rawToken, [
      VerificationTokenType.PASSWORD_RESET,
      VerificationTokenType.PARTNER_INVITE,
    ]);
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.user.update({ where: { id: token.userId }, data: { passwordHash } });
    await this.prisma.session.updateMany({ where: { userId: token.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit.record({ userId: token.userId, action: 'auth.password.reset', entity: 'User', entityId: token.userId });
    return { ok: true };
  }

  async login(dto: LoginDto, ctx: RequestContext): Promise<{ user: PublicUser; tokens: IssuedTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    const now = new Date();

    // Brute-force lockout: refuse while the account is locked, before any password work.
    if (user?.lockedUntil && user.lockedUntil > now) {
      await this.audit.record({ userId: user.id, action: 'auth.login.locked', ...ctx });
      throw new UnauthorizedException('Account temporarily locked due to too many failed attempts. Try again later.');
    }

    // Constant-ish failure: still verify against a dummy hash to reduce timing leaks.
    const ok = user
      ? await argon2.verify(user.passwordHash, dto.password).catch(() => false)
      : await argon2
          .verify('$argon2id$v=19$m=65536,t=3,p=4$0000000000000000$0000000000000000000000000000000000000000000', dto.password)
          .catch(() => false);

    if (!user || !ok || user.status !== 'ACTIVE') {
      if (user) {
        // Count this failure; lock the account once the threshold is reached.
        const attempts = user.failedLoginAttempts + 1;
        const lock = attempts >= MAX_FAILED_ATTEMPTS;
        await this.prisma.user.update({
          where: { id: user.id },
          data: lock
            ? { failedLoginAttempts: 0, lockedUntil: new Date(now.getTime() + LOCKOUT_MS) }
            : { failedLoginAttempts: attempts },
        });
      }
      await this.audit.record({ userId: user?.id, action: 'auth.login.failed', metadata: { email: maskEmail(dto.email) }, ...ctx });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Second factor. Authenticator TOTP takes precedence; otherwise, when email
    // OTP is enabled, require a one-time code emailed to the user.
    if (user.twoFactorEnabled) {
      if (!dto.totp) {
        throw new UnauthorizedException({ message: 'Two-factor code required', error: 'TwoFactorRequired' });
      }
      const secret = user.twoFactorSecret ? this.crypto.decrypt(user.twoFactorSecret) : '';
      const valid = authenticator.verify({ token: dto.totp, secret });
      if (!valid) throw new UnauthorizedException('Invalid two-factor code');
      // Replay guard: reject a code from a time-step we've already accepted.
      const step = Math.floor(now.getTime() / 30000);
      if (AuthService.isTotpReplay(step, user.lastTotpStep)) {
        throw new UnauthorizedException('This two-factor code was already used.');
      }
      await this.prisma.user.update({ where: { id: user.id }, data: { lastTotpStep: step } });
    } else if (this.config.get('LOGIN_EMAIL_OTP', { infer: true })) {
      if (!dto.emailOtp) {
        await this.issueLoginOtp(user);
        throw new UnauthorizedException({
          message: 'We emailed you a verification code',
          error: 'EmailOtpRequired',
        });
      }
      await this.verifyLoginOtp(user.id, dto.emailOtp);
    }

    // Successful login: clear any accumulated failed-attempt / lockout state.
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
    }

    const tokens = await this.issueSession(user, ctx);
    await this.audit.record({ userId: user.id, action: 'auth.login', ...ctx });
    // Security notification — fire-and-forget so a mail failure never blocks login.
    void this.email
      .sendLoginAlert(user.email, {
        firstName: user.firstName,
        time: new Date().toISOString(),
        ip: ctx.ip ?? 'unknown',
        device: ctx.userAgent ?? 'unknown',
      })
      .catch(() => undefined);
    return { user: this.toPublic(user), tokens };
  }

  /** Rotate a refresh token: validates the session, then replaces it. */
  async refresh(refreshToken: string | undefined, ctx: RequestContext): Promise<IssuedTokens> {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    let payload;
    try {
      payload = await this.tokens.verifyRefresh(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
    const hash = this.tokens.hashToken(refreshToken);
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.refreshTokenHash !== hash
    ) {
      // Possible token reuse/theft — revoke all sessions for this user.
      if (session) await this.prisma.session.updateMany({ where: { userId: session.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Account unavailable');

    const accessToken = await this.tokens.signAccess({ sub: user.id, email: user.email, role: user.role });
    const newRefresh = await this.tokens.signRefresh({ sub: user.id, sid: session.id });
    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: this.tokens.hashToken(newRefresh) },
    });

    return { accessToken, refreshToken: newRefresh };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.tokens.verifyRefresh(refreshToken);
      await this.prisma.session.updateMany({
        where: { id: payload.sid, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      /* already invalid — nothing to revoke */
    }
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toPublic(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ctx: RequestContext,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await argon2.verify(user.passwordHash, currentPassword).catch(() => false);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    // Invalidate all other sessions after a password change.
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({ userId, action: 'auth.password.change', ...ctx });
    void this.email
      .sendNotification(user.email, {
        firstName: user.firstName,
        title: 'Your password was changed',
        body: "Your 27 Markets password was just changed. If this wasn't you, reset your password immediately and contact support.",
      })
      .catch(() => undefined);
  }

  // ── 2FA ──

  async startTwoFactor(userId: string): Promise<{ otpauthUrl: string; qrDataUrl: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: this.crypto.encrypt(secret) } });
    const issuer = this.config.get('TOTP_ISSUER', { infer: true });
    const otpauthUrl = authenticator.keyuri(user.email, issuer, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { otpauthUrl, qrDataUrl };
  }

  async enableTwoFactor(userId: string, code: string, ctx: RequestContext): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorSecret) throw new UnauthorizedException('Start 2FA setup first');
    const valid = authenticator.verify({ token: code, secret: this.crypto.decrypt(user.twoFactorSecret) });
    if (!valid) throw new UnauthorizedException('Invalid two-factor code');
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
    await this.audit.record({ userId, action: 'auth.2fa.enabled', ...ctx });
    void this.email
      .sendNotification(user.email, {
        firstName: user.firstName,
        title: 'Two-factor authentication enabled',
        body: "Authenticator-app two-factor authentication was turned on for your account. If this wasn't you, contact support immediately.",
      })
      .catch(() => undefined);
  }

  async disableTwoFactor(userId: string, dto: DisableTwoFactorDto, ctx: RequestContext): Promise<void> {
    // Step-up re-auth: disabling 2FA removes an account-takeover barrier, so it
    // must require the current password AND a valid current code — a stolen
    // access token alone can't turn it off.
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Not authenticated');
    const pwOk = await argon2.verify(user.passwordHash, dto.currentPassword).catch(() => false);
    if (!pwOk) throw new UnauthorizedException('Current password is incorrect.');
    const secret = user.twoFactorSecret ? this.crypto.decrypt(user.twoFactorSecret) : '';
    if (!authenticator.verify({ token: dto.code, secret })) {
      throw new UnauthorizedException('Invalid two-factor code.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    await this.audit.record({ userId, action: 'auth.2fa.disabled', ...ctx });
    void this.email
      .sendNotification(user.email, {
        firstName: user.firstName,
        title: 'Two-factor authentication disabled',
        body: "Two-factor authentication was turned off for your account. If this wasn't you, reset your password and re-enable 2FA immediately.",
      })
      .catch(() => undefined);
  }

  // ── helpers ──

  /** Generate + email a login OTP; skips regeneration if one was sent very recently. */
  private async issueLoginOtp(user: User): Promise<void> {
    const now = Date.now();
    const existing = await this.prisma.loginOtp.findUnique({ where: { userId: user.id } });
    // Anti-spam: a still-valid code sent within the resend window is left as-is.
    if (
      existing &&
      existing.expiresAt.getTime() > now &&
      existing.createdAt.getTime() > now - LOGIN_OTP_RESEND_MS
    ) {
      return;
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = this.hashToken(code);
    const expiresAt = new Date(now + LOGIN_OTP_TTL_MS);
    await this.prisma.loginOtp.upsert({
      where: { userId: user.id },
      create: { userId: user.id, codeHash, expiresAt },
      update: { codeHash, attempts: 0, expiresAt, createdAt: new Date(now) },
    });
    await this.email.sendLoginCode(user.email, code).catch(() => undefined);
  }

  /** Verify a login OTP, bounding wrong guesses; consumes it on success. */
  private async verifyLoginOtp(userId: string, code: string): Promise<void> {
    const otp = await this.prisma.loginOtp.findUnique({ where: { userId } });
    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Your code has expired. Please request a new one.');
    }
    if (otp.attempts >= LOGIN_OTP_MAX_ATTEMPTS) {
      await this.prisma.loginOtp.delete({ where: { userId } });
      throw new UnauthorizedException('Too many attempts. Please request a new code.');
    }
    if (this.hashToken(code) !== otp.codeHash) {
      await this.prisma.loginOtp.update({ where: { userId }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('Invalid code.');
    }
    await this.prisma.loginOtp.delete({ where: { userId } });
  }

  private async issueSession(user: User, ctx: RequestContext): Promise<IssuedTokens> {
    const ttl = this.config.get('REFRESH_TOKEN_TTL', { infer: true });
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'pending',
        userAgent: ctx.userAgent,
        ip: ctx.ip,
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });

    const accessToken = await this.tokens.signAccess({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = await this.tokens.signRefresh({ sub: user.id, sid: session.id });
    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: this.tokens.hashToken(refreshToken) },
    });

    return { accessToken, refreshToken };
  }
}
