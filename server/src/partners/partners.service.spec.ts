import { PartnersService } from './partners.service';

describe('PartnersService.apply', () => {
  it('creates a PENDING application (lowercased email)', async () => {
    const created = { id: 'app1' };
    const prisma = { partnerApplication: { create: jest.fn().mockResolvedValue(created) } } as any;
    const audit = { record: jest.fn() } as any;
    const config = { get: jest.fn().mockReturnValue('https://app.example') } as any;
    const service = new PartnersService(prisma, audit, config);

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
    const service = new PartnersService(prisma, audit, config);
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
    const service = new PartnersService(prisma, audit, config);
    await expect(service.approve('admin1', 'app1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the email already has a user (409)', async () => {
    const { prisma, audit, config } = deps();
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
    const { PartnersService } = require('./partners.service');
    const service = new PartnersService(prisma, audit, config);
    await expect(service.approve('admin1', 'app1')).rejects.toBeInstanceOf(ConflictException);
  });
});
