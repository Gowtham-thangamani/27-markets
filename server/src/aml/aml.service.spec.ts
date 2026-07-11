import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AmlService } from './aml.service';
import { SimulationAmlProvider, type AmlProvider } from './aml-provider';

const audit = { record: jest.fn() } as any;
const cfg = (vals: Record<string, unknown> = {}) => ({ get: (k: string) => vals[k] }) as any;

function makePrisma(over: any = {}) {
  return {
    user: { findUnique: jest.fn().mockResolvedValue({ firstName: 'Ada', lastName: 'Lovelace', country: 'GB', dateOfBirth: null }) },
    amlScreening: {
      create: jest.fn(({ data }: any) => Promise.resolve({ id: 's1', ...data, screenedAt: new Date('2026-01-01T00:00:00Z') })),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...over,
  };
}

describe('AmlService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('screen persists the result and audits', async () => {
    const provider: AmlProvider = { name: 'test', screen: jest.fn().mockResolvedValue({ status: 'CLEAR', provider: 'test', reference: 'r', hits: [] }) };
    const prisma = makePrisma();
    const svc = new AmlService(prisma as any, provider, audit);
    const res = await svc.screen('u1', 'admin1');
    expect(res.status).toBe('CLEAR');
    expect(prisma.amlScreening.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'u1', status: 'CLEAR' }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'aml.screen' }));
  });

  it('screen throws NotFound for a missing user', async () => {
    const provider: AmlProvider = { name: 'test', screen: jest.fn() };
    const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue(null) } });
    const svc = new AmlService(prisma as any, provider, audit);
    await expect(svc.screen('nope')).rejects.toThrow(NotFoundException);
  });

  it('assertNotBlocked throws when the latest screening is a HIT', async () => {
    const provider: AmlProvider = { name: 'test', screen: jest.fn() };
    const prisma = makePrisma({ amlScreening: { findFirst: jest.fn().mockResolvedValue({ status: 'HIT' }), create: jest.fn(), findMany: jest.fn() } });
    const svc = new AmlService(prisma as any, provider, audit);
    await expect(svc.assertNotBlocked('u1')).rejects.toThrow(ForbiddenException);
  });

  it('assertNotBlocked passes when CLEAR or unscreened', async () => {
    const provider: AmlProvider = { name: 'test', screen: jest.fn() };
    const svc = new AmlService(makePrisma() as any, provider, audit);
    await expect(svc.assertNotBlocked('u1')).resolves.toBeUndefined();
  });

  it('screenSafe never throws', async () => {
    const provider: AmlProvider = { name: 'test', screen: jest.fn().mockRejectedValue(new Error('provider down')) };
    const svc = new AmlService(makePrisma() as any, provider, audit);
    await expect(svc.screenSafe('u1')).resolves.toBeUndefined();
  });
});

describe('SimulationAmlProvider', () => {
  it('returns CLEAR by default', async () => {
    const p = new SimulationAmlProvider(cfg({}));
    const r = await p.screen({ userId: 'u1', fullName: 'Ada Lovelace' });
    expect(r.status).toBe('CLEAR');
    expect(r.hits).toHaveLength(0);
  });

  it('returns HIT for a name on the denylist', async () => {
    const p = new SimulationAmlProvider(cfg({ AML_SIM_DENYLIST: 'Bad Actor, Test Hit' }));
    const r = await p.screen({ userId: 'u1', fullName: 'Test Hit' });
    expect(r.status).toBe('HIT');
    expect(r.hits[0].list).toBe('SIM_DENYLIST');
  });
});
