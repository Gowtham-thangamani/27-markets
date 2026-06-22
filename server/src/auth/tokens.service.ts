import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@prisma/client';
import type { Env } from '../config/env.validation';

export interface AccessPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface RefreshPayload {
  sub: string;
  sid: string; // session id
}

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  signAccess(payload: AccessPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('ACCESS_TOKEN_TTL', { infer: true }),
    });
  }

  signRefresh(payload: RefreshPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: this.config.get('REFRESH_TOKEN_TTL', { infer: true }),
    });
  }

  verifyAccess(token: string): Promise<AccessPayload> {
    return this.jwt.verifyAsync<AccessPayload>(token, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  verifyRefresh(token: string): Promise<RefreshPayload> {
    return this.jwt.verifyAsync<RefreshPayload>(token, {
      secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
    });
  }

  /** High-entropy tokens only need a fast one-way hash for at-rest storage. */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
