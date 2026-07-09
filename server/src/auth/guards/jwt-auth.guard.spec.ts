import { JwtAuthGuard } from './jwt-auth.guard';

const ctxWith = (req: any) =>
  ({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => null,
    getClass: () => null,
  }) as any;

describe('JwtAuthGuard — status revocation (M-4)', () => {
  const make = (status: string) => {
    const tokens = { verifyAccess: jest.fn().mockResolvedValue({ sub: 'u1', email: 'a@x.com', role: 'CLIENT' }) };
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) }; // route is not @Public
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ status }) } };
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
});
