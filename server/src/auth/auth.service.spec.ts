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

  it('accepts a PARTNER_INVITE token on the reset-password path', async () => {
    const prisma = {
      verificationToken: {
        findFirst: jest.fn().mockResolvedValue({ id: 't2', userId: 'u2', type: 'PARTNER_INVITE', usedAt: null, expiresAt: future }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
      session: { updateMany: jest.fn().mockResolvedValue({}) },
    } as any;
    const service = make(prisma);

    await service.resetPassword('partner-raw', 'NewPass123');

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u2' }, data: expect.objectContaining({ passwordHash: expect.any(String) }) }));
    expect(prisma.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u2', revokedAt: null } }));
  });
});

// Helper: builds a prisma mock suitable for the register() method.
const makeRegisterPrisma = (partnerProfileFindUnique: jest.Mock) => ({
  user: {
    findUnique: jest.fn().mockResolvedValue(null), // no existing user
    create: jest.fn().mockResolvedValue({
      id: 'new-user-1',
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Smith',
      role: 'CLIENT',
      twoFactorEnabled: false,
      emailVerified: false,
      phone: null,
      country: null,
    }),
  },
  verificationToken: { create: jest.fn().mockResolvedValue({}) },
  session: {
    create: jest.fn().mockResolvedValue({ id: 'sess1', expiresAt: future }),
    update: jest.fn().mockResolvedValue({}),
  },
  partnerProfile: { findUnique: partnerProfileFindUnique },
} as any);

const validRegisterDto = {
  email: 'alice@example.com',
  password: 'Password1',
  firstName: 'Alice',
  lastName: 'Smith',
  acceptTerms: true as const,
};

const makeRegisterService = (prisma: any) =>
  new (require('./auth.service').AuthService)(
    prisma,
    // tokens: needs signAccess + signRefresh + hashToken
    { signAccess: jest.fn().mockResolvedValue('access-tok'), signRefresh: jest.fn().mockResolvedValue('refresh-tok'), hashToken: jest.fn().mockReturnValue('hashed') } as any,
    { record: jest.fn() } as any,   // audit
    { convertOnRegister: jest.fn().mockResolvedValue(undefined) } as any,  // leads
    { get: jest.fn().mockReturnValue(3600) } as any,  // config
    {} as any,                      // crypto
    { sendVerifyEmail: jest.fn().mockResolvedValue(undefined), sendWelcome: jest.fn().mockResolvedValue(undefined) } as any, // email
    { create: jest.fn().mockResolvedValue(undefined) } as any, // accounts
  );

describe('AuthService.register – referral attribution', () => {
  it('sets referredByPartnerId when ref matches a known referral code', async () => {
    const partnerFindUnique = jest.fn().mockResolvedValue({ userId: 'partnerUser1' });
    const prisma = makeRegisterPrisma(partnerFindUnique);
    const service = makeRegisterService(prisma);

    await service.register({ ...validRegisterDto, ref: 'CODE1234' }, { ip: '127.0.0.1' });

    expect(partnerFindUnique).toHaveBeenCalledWith({ where: { referralCode: 'CODE1234' } });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ referredByPartnerId: 'partnerUser1' }),
      }),
    );
  });

  it('does not block registration when ref is unknown (referredByPartnerId is null)', async () => {
    const partnerFindUnique = jest.fn().mockResolvedValue(null);
    const prisma = makeRegisterPrisma(partnerFindUnique);
    const service = makeRegisterService(prisma);

    const result = await service.register({ ...validRegisterDto, ref: 'UNKNOWN99' }, { ip: '127.0.0.1' });

    expect(result).toBeDefined();
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ referredByPartnerId: null }),
      }),
    );
  });

  it('does not set referredByPartnerId when no ref is supplied', async () => {
    const partnerFindUnique = jest.fn();
    const prisma = makeRegisterPrisma(partnerFindUnique);
    const service = makeRegisterService(prisma);

    await service.register({ ...validRegisterDto }, { ip: '127.0.0.1' });

    expect(partnerFindUnique).not.toHaveBeenCalled();
  });
});
