import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { requestContext } from './request-context';

/**
 * Seeds the per-request context (source IP + user-agent) and runs the rest of
 * the request inside it, so downstream services (audit trail) can read them.
 * Relies on `trust proxy` (set in production) for a correct client IP.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const ctx = { ip: req.ip, userAgent: req.get('user-agent') ?? undefined };
    requestContext.run(ctx, () => next());
  }
}
