import { JwtAuthGuard } from './jwt-auth.guard';

const ctxWith = (req: any) =>
  ({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => null,
    getClass: () => null,
  }) as any;

describe('JwtAuthGuard — status revocation (M-4)', () => {
  const make = (status: string, dbRole = 'CLIENT') => {
    const tokens = { verifyAccess: jest.fn().mockResolvedValue({ sub: 'u1', email: 'a@x.com', role: 'ADMIN' }) };
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) }; // route is not @Public
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ status, role: dbRole }) } };
    return new JwtAuthGuard(tokens as any, reflector as any, prisma as any);
  };
  const req = () => ({ headers: { authorization: 'Bearer t' }, cookies: {} });

  it('rejects a suspended user even with a valid token', async () => {
    await expect(make('SUSPENDED').canActivate(ctxWith(req()))).rejects.toThrow();
  });

  it('rejects a closed account', async () => {
    await expect(make('CLOSED').canActivate(ctxWith(req()))).rejects.toThrow();
  });

  it('allows an active user', async () => {
    await expect(make('ACTIVE').canActivate(ctxWith(req()))).resolves.toBe(true);
  });

  it('uses the DB role, not the token role (stale-role hardening)', async () => {
    // Token says ADMIN, DB says CLIENT (demoted) — req.user.role must be CLIENT.
    const r: any = req();
    await make('ACTIVE', 'CLIENT').canActivate(ctxWith(r));
    expect(r.user.role).toBe('CLIENT');
  });
});
