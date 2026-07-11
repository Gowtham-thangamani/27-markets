import { NotFoundException } from '@nestjs/common';
import { KycVerificationService } from './kyc-verification.service';
import { ManualKycProvider } from './kyc-provider';

const cfg = (v: Record<string, unknown> = {}) => ({ get: (k: string) => v[k] ?? '' }) as any;

describe('KycVerificationService', () => {
  it('manual provider returns no hosted session (upload flow) and does not persist a ref', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'a@x.io', firstName: 'Ada', lastName: 'Lovelace' }) },
      kycProfile: { upsert: jest.fn() },
    } as any;
    const svc = new KycVerificationService(prisma, new ManualKycProvider(), cfg({ CLIENT_ORIGIN: 'https://app' }));
    const res = await svc.startSession('u1');
    expect(res).toEqual({ url: null, provider: 'manual' });
    expect(prisma.kycProfile.upsert).not.toHaveBeenCalled();
  });

  it('persists the providerRef when a provider returns a session reference', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'a@x.io', firstName: 'Ada', lastName: 'Lovelace' }) },
      kycProfile: { upsert: jest.fn() },
    } as any;
    const provider = { name: 'external', createVerificationSession: jest.fn().mockResolvedValue({ provider: 'external', reference: 'vs_1', url: 'https://idv/flow' }) };
    const svc = new KycVerificationService(prisma, provider as any, cfg({ CLIENT_ORIGIN: 'https://app' }));
    const res = await svc.startSession('u1');
    expect(res.url).toBe('https://idv/flow');
    expect(prisma.kycProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { providerRef: 'vs_1' } }),
    );
  });

  it('throws NotFound for a missing user', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) }, kycProfile: { upsert: jest.fn() } } as any;
    const svc = new KycVerificationService(prisma, new ManualKycProvider(), cfg());
    await expect(svc.startSession('nope')).rejects.toThrow(NotFoundException);
  });
});
