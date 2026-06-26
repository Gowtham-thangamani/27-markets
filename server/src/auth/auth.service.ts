import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CryptoService } from '../common/crypto.service';
import { LeadsService } from '../leads/leads.service';
import { TokensService } from './tokens.service';
import { RegisterDto, LoginDto } from './dto';
import type { Env } from '../config/env.validation';

export interface RequestContext {
  ip?: string;
  userAgent?: string;
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
  ) {}

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }

  async register(dto: RegisterDto, ctx: RequestContext): Promise<{ user: PublicUser; tokens: IssuedTokens }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        country: dto.country,
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

    const tokens = await this.issueSession(user, ctx);
    await this.audit.record({ userId: user.id, action: 'auth.register', entity: 'User', entityId: user.id, ...ctx });
    return { user: this.toPublic(user), tokens };
  }

  async login(dto: LoginDto, ctx: RequestContext): Promise<{ user: PublicUser; tokens: IssuedTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });

    // Constant-ish failure: still verify against a dummy hash to reduce timing leaks.
    const ok = user
      ? await argon2.verify(user.passwordHash, dto.password).catch(() => false)
      : await argon2
          .verify('$argon2id$v=19$m=65536,t=3,p=4$0000000000000000$0000000000000000000000000000000000000000000', dto.password)
          .catch(() => false);

    if (!user || !ok || user.status !== 'ACTIVE') {
      await this.audit.record({ userId: user?.id, action: 'auth.login.failed', metadata: { email: dto.email }, ...ctx });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.twoFactorEnabled) {
      if (!dto.totp) {
        throw new UnauthorizedException({ message: 'Two-factor code required', error: 'TwoFactorRequired' });
      }
      const secret = user.twoFactorSecret ? this.crypto.decrypt(user.twoFactorSecret) : '';
      const valid = authenticator.verify({ token: dto.totp, secret });
      if (!valid) throw new UnauthorizedException('Invalid two-factor code');
    }

    const tokens = await this.issueSession(user, ctx);
    await this.audit.record({ userId: user.id, action: 'auth.login', ...ctx });
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
  }

  async disableTwoFactor(userId: string, ctx: RequestContext): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    await this.audit.record({ userId, action: 'auth.2fa.disabled', ...ctx });
  }

  // ── helpers ──

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
