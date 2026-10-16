import { PartnersService } from './partners.service';

describe('PartnersService.apply', () => {
  it('creates a PENDING application (lowercased email)', async () => {
    const created = { id: 'app1' };
    const prisma = { partnerApplication: { create: jest.fn().mockResolvedValue(created) } } as any;
    const audit = { record: jest.fn() } as any;
    const config = { get: jest.fn().mockReturnValue('https://app.example') } as any;
    const service = new PartnersService(prisma, audit, config, { sendNotification: jest.fn().mockResolvedValue(undefined) } as any);

    const res = await service.apply({
      firstName: 'Pat', lastName: 'Lee', email: 'Pat@Example.com', company: 'PatPromo',
    } as any);

    expect(res).toEqual({ id: 'app1' });
    expect(prisma.partnerApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'pat@example.com', status: 'PENDING' }) }),
    );
  });
});

import { BadRequestException, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('PartnersService.approve', () => {
  function deps(overrides: any = {}) {
    const prismaTx: any = {
      partnerApplication: {
        findUnique: jest.fn().mockResolvedValue({ id: 'app1', status: 'PENDING', email: 'p@x.io', firstName: 'Pat', lastName: 'Lee', phone: null, country: null }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'u1' }) },
      partnerProfile: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
      verificationToken: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = {
      ...prismaTx,
      $transaction: jest.fn(async (fn: any) => fn(prismaTx)),
      ...overrides,
    };
    const audit = { record: jest.fn() } as any;
    const config = { get: jest.fn().mockReturnValue('https://app.example') } as any;
    return { prisma, audit, config };
  }

  it('creates a partner user + profile + invite token and returns code + inviteUrl', async () => {
    const { prisma, audit, config } = deps();
    const { PartnersService } = require('./partners.service');
    const service = new PartnersService(prisma, audit, config, { sendNotification: jest.fn().mockResolvedValue(undefined) } as any);
    const res = await service.approve('admin1', 'app1');
    expect(res.ok).toBe(true);
    expect(res.referralCode).toHaveLength(8);
    expect(res.inviteUrl).toContain('https://app.example/reset-password?token=');
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: 'PARTNER' }) }));
  });

  it('rejects a non-PENDING application with 400', async () => {
    const { prisma, audit, config } = deps();
    prisma.partnerApplication.findUnique.mockResolvedValue({ id: 'app1', status: 'APPROVED' });
    const { PartnersService } = require('./partners.service');
    const service = new PartnersService(prisma, audit, config, { sendNotification: jest.fn().mockResolvedValue(undefined) } as any);
    await expect(service.approve('admin1', 'app1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('attaches a partner profile to an existing client account instead of creating a duplicate', async () => {
    const { prisma, audit, config } = deps();
    prisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'p@x.io', firstName: 'Pat', role: 'CLIENT', partnerProfile: null });
    const email = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    const { PartnersService } = require('./partners.service');
    const service = new PartnersService(prisma, audit, config, email as any);

    const res = await service.approve('admin1', 'app1');

    expect(res).toEqual({ ok: true, referralCode: expect.any(String), inviteUrl: null });
    expect(prisma.partnerProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'existing' }) }),
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(email.sendNotification).toHaveBeenCalledWith('p@x.io', expect.objectContaining({ firstName: 'Pat' }));
  });

  it('resolves an application from someone who is already a partner, without a second profile', async () => {
    // This used to throw 409 on every attempt, which left the application
    // PENDING forever: approving was impossible and rejecting would file a
    // false record against a real partner. Approving is now idempotent — it
    // closes the application against the profile they already have.
    const { prisma, audit, config } = deps();
    prisma.user.findUnique.mockResolvedValue({
      id: 'existing',
      role: 'CLIENT',
      partnerProfile: { id: 'pp1', referralCode: 'EXISTING' },
    });
    const email = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    const { PartnersService } = require('./partners.service');
    const service = new PartnersService(prisma, audit, config, email as any);

    const res = await service.approve('admin1', 'app1');

    expect(res).toEqual({ ok: true, referralCode: 'EXISTING', inviteUrl: null });
    expect(prisma.partnerProfile.create).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.partnerApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'app1' },
        data: expect.objectContaining({ status: 'APPROVED', resultingUserId: 'existing' }),
      }),
    );
    // Nothing changed for them, so no "you're approved" email.
    expect(email.sendNotification).not.toHaveBeenCalled();
  });

  it('rejects when the existing account is staff (409)', async () => {
    const { prisma, audit, config } = deps();
    prisma.user.findUnique.mockResolvedValue({ id: 'existing', role: 'ADMIN', partnerProfile: null });
    const { PartnersService } = require('./partners.service');
    const service = new PartnersService(prisma, audit, config, { sendNotification: jest.fn().mockResolvedValue(undefined) } as any);
    await expect(service.approve('admin1', 'app1')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('PartnersService sub-IB upline', () => {
  const applyDeps = (uplineUserId: string | null) => {
    const prisma = {
      partnerApplication: { create: jest.fn().mockResolvedValue({ id: 'app1' }) },
      partnerProfile: {
        findUnique: jest.fn().mockResolvedValue(uplineUserId ? { userId: uplineUserId } : null),
      },
    } as any;
    const service = new PartnersService(prisma, { record: jest.fn() } as any, { get: jest.fn() } as any, {} as any);
    return { service, prisma };
  };

  it('records the introducing partner when ?ref= matches a referral code', async () => {
    const { service, prisma } = applyDeps('user1');

    await service.apply({ firstName: 'Sub', lastName: 'IB', email: 'sub@x.io', ref: 'code1' } as any);

    // Codes are stored uppercase; the lookup must normalise before matching.
    expect(prisma.partnerProfile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { referralCode: 'CODE1' } }),
    );
    expect(prisma.partnerApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ referredByPartnerId: 'user1' }) }),
    );
  });

  it('still accepts the application when the ref code is unknown', async () => {
    const { service, prisma } = applyDeps(null);

    const res = await service.apply({ firstName: 'Sub', lastName: 'IB', email: 'sub@x.io', ref: 'BOGUS' } as any);

    expect(res).toEqual({ id: 'app1' });
    expect(prisma.partnerApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ referredByPartnerId: null }) }),
    );
  });

  it('carries the upline onto the new partner profile on approval', async () => {
    const prismaTx: any = {
      partnerApplication: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'app1', status: 'PENDING', email: 'sub@x.io', firstName: 'Sub', lastName: 'IB',
          phone: null, country: null, referredByPartnerId: 'user1',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'u2' }) },
      partnerProfile: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
      verificationToken: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = { ...prismaTx, $transaction: jest.fn(async (fn: any) => fn(prismaTx)) };
    const service = new PartnersService(prisma, { record: jest.fn() } as any, {
      get: jest.fn().mockReturnValue('https://app.example'),
    } as any, {} as any);

    await service.approve('admin1', 'app1');

    expect(prismaTx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          partnerProfile: { create: expect.objectContaining({ parentPartnerId: 'user1' }) },
        }),
      }),
    );
  });
});
