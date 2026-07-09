import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../config/env.validation';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defense for cookie-authenticated requests. On any state-changing method,
 * if the browser sent an Origin (or Referer), it must be on the CLIENT_ORIGIN
 * allowlist — a forged cross-site request carries the attacker's origin and is
 * rejected. Requests with no Origin (server-to-server, e.g. the Stripe webhook,
 * or non-browser API clients using Bearer tokens) pass through: browsers always
 * attach Origin to cross-origin state-changing requests, so this can't be
 * stripped from a victim's browser.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowed: Set<string>;

  constructor(config: ConfigService<Env, true>) {
    this.allowed = new Set(
      config
        .get('CLIENT_ORIGIN', { infer: true })
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method.toUpperCase())) return true;

    const origin = this.originOf(req);
    if (origin && !this.allowed.has(origin)) {
      throw new ForbiddenException('Cross-origin request blocked');
    }
    return true;
  }

  private originOf(req: Request): string | undefined {
    const origin = req.headers.origin;
    if (origin) return origin;
    const referer = req.headers.referer;
    if (!referer) return undefined;
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }
}
