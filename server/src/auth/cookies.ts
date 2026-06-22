import type { Response } from 'express';
import type { Env } from '../config/env.validation';
import type { ConfigService } from '@nestjs/config';
import type { IssuedTokens } from './auth.service';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
export const REFRESH_COOKIE_NAME = REFRESH_COOKIE;

/** httpOnly, sameSite cookies. `secure` is on outside development. */
export function setAuthCookies(
  res: Response,
  tokens: IssuedTokens,
  config: ConfigService<Env, true>,
): void {
  const isProd = config.get('NODE_ENV', { infer: true }) === 'production';
  const accessTtl = config.get('ACCESS_TOKEN_TTL', { infer: true });
  const refreshTtl = config.get('REFRESH_TOKEN_TTL', { infer: true });

  const base = {
    httpOnly: true as const,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
  };

  res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...base, maxAge: accessTtl * 1000 });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    path: '/api/auth',
    maxAge: refreshTtl * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}
