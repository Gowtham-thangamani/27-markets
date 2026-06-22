import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

const ctxWith = (role?: UserRole) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { id: 'u', email: 'e@x.com', role } : undefined }),
    }),
    getHandler: () => null,
    getClass: () => null,
  }) as any;

const reflectorFor = (roles?: UserRole[]) =>
  ({ getAllAndOverride: () => roles }) as unknown as Reflector;

describe('RolesGuard (two-tier staff access)', () => {
  it('allows ADMIN when staff roles required', () => {
    const guard = new RolesGuard(reflectorFor([UserRole.ADMIN, UserRole.AGENT]));
    expect(guard.canActivate(ctxWith(UserRole.ADMIN))).toBe(true);
  });
  it('allows AGENT when staff roles required', () => {
    const guard = new RolesGuard(reflectorFor([UserRole.ADMIN, UserRole.AGENT]));
    expect(guard.canActivate(ctxWith(UserRole.AGENT))).toBe(true);
  });
  it('denies CLIENT when staff roles required', () => {
    const guard = new RolesGuard(reflectorFor([UserRole.ADMIN, UserRole.AGENT]));
    expect(() => guard.canActivate(ctxWith(UserRole.CLIENT))).toThrow(ForbiddenException);
  });
  it('denies AGENT when only ADMIN required', () => {
    const guard = new RolesGuard(reflectorFor([UserRole.ADMIN]));
    expect(() => guard.canActivate(ctxWith(UserRole.AGENT))).toThrow(ForbiddenException);
  });
});
