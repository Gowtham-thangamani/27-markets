import { AuthService } from './auth.service';

// Constructor: (prisma, tokens, audit, leads, config, crypto, email, accounts)
const make = (prisma: any, email: any = { sendVerifyEmail: jest.fn(), sendPasswordReset: jest.fn(), sendWelcome: jest.fn() }) =>
  new AuthService(prisma, {} as any, { record: jest.fn() } as any, {} as any, {} as any, {} as any, email as any, {} as any);

const future = new Date(Date.now() + 60_000);

describe('AuthService.verifyEmail', () => {
  it('marks the user verified and consumes the token', async () => {
    const prisma = {
      verificationToken: {
        findFirst: jest.fn().mockResolvedValue({ id: 't1', userId: 'u1', type: 'EMAIL_VERIFY', usedAt: null, expiresAt: future }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
    } as any;
    const service = make(prisma);

    await service.verifyEmail('raw-token');

    expect(prisma.verificationToken.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 't1' }, data: expect.objectContaining({ usedAt: expect.any(Date) }) }));
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { emailVerified: true } });
  });

  it('rejects an invalid/expired token', async () => {
    const prisma = { verificationToken: { findFirst: jest.fn().mockResolvedValue(null) } } as any;
    await expect(make(prisma).verifyEmail('bad')).rejects.toThrow('invalid or has expired');
  });
});

describe('AuthService.forgotPassword', () => {
  it('does not reveal whether the account exists', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const email = { sendPasswordReset: jest.fn() };
    const res = await make(prisma, email).forgotPassword('nobody@x.com');
    expect(res).toEqual({ ok: true });
    expect(email.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('issues a reset token + emails it when the user exists', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@x.com' }) },
      verificationToken: { create: jest.fn().mockResolvedValue({}) },
    } as any;
    const email = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) };
    await make(prisma, email).forgotPassword('a@x.com');
    expect(prisma.verificationToken.create).toHaveBeenCalled();
    expect(email.sendPasswordReset).toHaveBeenCalledWith('a@x.com', expect.any(String));
  });
});

describe('AuthService.resetPassword', () => {
  it('sets a new password and revokes sessions', async () => {
    const prisma = {
      verificationToken: {
        findFirst: jest.fn().mockResolvedValue({ id: 't1', userId: 'u1', type: 'PASSWORD_RESET', usedAt: null, expiresAt: future }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
      session: { updateMany: jest.fn().mockResolvedValue({}) },
    } as any;
    const service = make(prisma);

    await service.resetPassword('raw', 'NewPass123');

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' }, data: expect.objectContaining({ passwordHash: expect.any(String) }) }));
    expect(prisma.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1', revokedAt: null } }));
  });
});
