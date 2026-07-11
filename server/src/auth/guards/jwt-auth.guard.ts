import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY, type AuthUser } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { TokensService } from '../tokens.service';

/** Validates the access token from the Authorization header or access cookie. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokensService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Authentication required');

    let payload;
    try {
      payload = await this.tokens.verifyAccess(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Enforce account status AND role on every request from the DB, not the
    // token, so a suspended/closed account is rejected immediately and a
    // demoted admin/agent loses privileges at once — not only after the access
    // token expires (M-4 + stale-role hardening).
    const account = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { status: true, role: true },
    });
    if (!account || account.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    req.user = { id: payload.sub, email: payload.email, role: account.role };
    return true;
  }

  private extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    return cookies?.access_token ?? null;
  }
}
