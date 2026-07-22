import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { KycVerificationService } from './kyc-verification.service';
import { ManualKycProvider } from './kyc-provider';

const cfg = (v: Record<string, unknown> = {}) => ({ get: (k: string) => v[k] ?? '' }) as any;
const audit = () => ({ record: jest.fn() }) as any;
const aml = () => ({ screenSafe: jest.fn() }) as any;

describe('KycVerificationService.startSession', () => {
  it('manual provider returns no hosted session (upload flow) and does not persist a ref', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'a@x.io', firstName: 'Ada', lastName: 'Lovelace' }) },
      kycProfile: { upsert: jest.fn() },
    } as any;
    const svc = new KycVerificationService(prisma, new ManualKycProvider(), cfg({ CLIENT_ORIGIN: 'https://app' }), audit(), aml());
    const res = await svc.startSession('u1');
    expect(res).toEqual({ url: null, sdkToken: null, provider: 'manual' });
    expect(prisma.kycProfile.upsert).not.toHaveBeenCalled();
  });

  it('persists the providerRef and returns the sdk token when a provider returns a session', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'a@x.io', firstName: 'Ada', lastName: 'Lovelace' }) },
      kycProfile: { upsert: jest.fn() },
    } as any;
    const provider = { name: 'external', createVerificationSession: jest.fn().mockResolvedValue({ provider: 'external', reference: 'appl_1', url: null, sdkToken: 'tok_1' }) };
    const svc = new KycVerificationService(prisma, provider as any, cfg({ CLIENT_ORIGIN: 'https://app' }), audit(), aml());
    const res = await svc.startSession('u1');
    expect(res).toEqual({ url: null, sdkToken: 'tok_1', provider: 'external' });
    expect(prisma.kycProfile.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { providerRef: 'appl_1' } }));
  });

  it('throws NotFound for a missing user', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) }, kycProfile: { upsert: jest.fn() } } as any;
    const svc = new KycVerificationService(prisma, new ManualKycProvider(), cfg(), audit(), aml());
    await expect(svc.startSession('nope')).rejects.toThrow(NotFoundException);
  });
});

describe('KycVerificationService.applySumsubVerdict', () => {
  const SECRET = 'whsec';
  const signed = (payload: object) => {
    const raw = Buffer.from(JSON.stringify(payload));
    const digest = createHmac('sha256', SECRET).update(raw).digest('hex');
    return { raw, digest };
  };
  const make = (profile: any) => {
    const auditor = audit();
    const amls = aml();
    const prisma = {
      kycProfile: { findUnique: jest.fn().mockResolvedValue(profile), findFirst: jest.fn().mockResolvedValue(profile), update: jest.fn().mockResolvedValue({}) },
    } as any;
    const svc = new KycVerificationService(prisma, {} as any, cfg({ KYC_WEBHOOK_SECRET: SECRET }), auditor, amls);
    return { svc, prisma, auditor, amls };
  };

  it('rejects a payload with a bad signature (fail-closed)', async () => {
    const { svc } = make({ id: 'k1', userId: 'u1' });
    const { raw } = signed({ type: 'applicantReviewed', externalUserId: 'u1', reviewResult: { reviewAnswer: 'GREEN' } });
    await expect(svc.applySumsubVerdict(raw, 'deadbeef')).rejects.toThrow(BadRequestException);
  });

  it('approves all KYC steps and screens AML on a GREEN verdict', async () => {
    const { svc, prisma, amls } = make({ id: 'k1', userId: 'u1' });
    const { raw, digest } = signed({ type: 'applicantReviewed', externalUserId: 'u1', applicantId: 'appl_1', reviewResult: { reviewAnswer: 'GREEN' } });
    const r = await svc.applySumsubVerdict(raw, digest);
    expect(r).toEqual({ handled: true });
    expect(prisma.kycProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { identityStatus: 'APPROVED', addressStatus: 'APPROVED', selfieStatus: 'APPROVED' } }),
    );
    expect(amls.screenSafe).toHaveBeenCalledWith('u1');
  });

  it('rejects all KYC steps and does not screen on a RED verdict', async () => {
    const { svc, prisma, amls } = make({ id: 'k1', userId: 'u1' });
    const { raw, digest } = signed({ type: 'applicantReviewed', externalUserId: 'u1', reviewResult: { reviewAnswer: 'RED' } });
    await svc.applySumsubVerdict(raw, digest);
    expect(prisma.kycProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { identityStatus: 'REJECTED', addressStatus: 'REJECTED', selfieStatus: 'REJECTED' } }),
    );
    expect(amls.screenSafe).not.toHaveBeenCalled();
  });

  it('ignores non-review events', async () => {
    const { svc, prisma } = make({ id: 'k1', userId: 'u1' });
    const { raw, digest } = signed({ type: 'applicantCreated', externalUserId: 'u1' });
    expect(await svc.applySumsubVerdict(raw, digest)).toEqual({ handled: false });
    expect(prisma.kycProfile.update).not.toHaveBeenCalled();
  });
});
