import { LeadSource, LeadStatus } from '@prisma/client';
import { LeadsService } from './leads.service';

// Constructor order: (prisma, audit)

describe('LeadsService.capture', () => {
  it('creates a new lead (default source DEMO, status NEW) and audits it', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'l1', source: LeadSource.DEMO });
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = { lead: { findFirst: jest.fn().mockResolvedValue(null), create } } as any;
    const service = new LeadsService(prisma, { record } as any);

    const result = await service.capture({ name: 'Ada', email: 'Ada@X.com' } as any);

    const data = create.mock.calls[0][0].data;
    expect(data.email).toBe('ada@x.com'); // normalized to lowercase
    expect(data.source).toBe(LeadSource.DEMO);
    expect(data.status).toBe(LeadStatus.NEW);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'lead.capture' }));
    expect(result).toEqual({ id: 'l1', deduped: false });
  });

  it('de-dupes against an existing open lead with the same email', async () => {
    const create = jest.fn();
    const prisma = { lead: { findFirst: jest.fn().mockResolvedValue({ id: 'existing' }), create } } as any;
    const service = new LeadsService(prisma, { record: jest.fn() } as any);

    const result = await service.capture({ name: 'Ada', email: 'ada@x.com' } as any);

    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'existing', deduped: true });
  });
});

describe('LeadsService.convertOnRegister', () => {
  it('marks an existing lead CONVERTED and links the user', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      lead: { findFirst: jest.fn().mockResolvedValue({ id: 'l1' }), update, create: jest.fn() },
    } as any;
    const service = new LeadsService(prisma, { record: jest.fn() } as any);

    await service.convertOnRegister('user1', { name: 'Ada', email: 'ada@x.com' });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'l1' },
      data: { status: LeadStatus.CONVERTED, convertedUserId: 'user1' },
    });
  });

  it('creates a REGISTER→CONVERTED lead when none exists', async () => {
    const create = jest.fn().mockResolvedValue({});
    const prisma = {
      lead: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn(), create },
    } as any;
    const service = new LeadsService(prisma, { record: jest.fn() } as any);

    await service.convertOnRegister('user1', { name: 'Ada', email: 'ada@x.com' });

    const data = create.mock.calls[0][0].data;
    expect(data.source).toBe(LeadSource.REGISTER);
    expect(data.status).toBe(LeadStatus.CONVERTED);
    expect(data.convertedUserId).toBe('user1');
  });

  it('never throws into the signup flow', async () => {
    const prisma = { lead: { findFirst: jest.fn().mockRejectedValue(new Error('db down')) } } as any;
    const service = new LeadsService(prisma, { record: jest.fn() } as any);

    await expect(service.convertOnRegister('user1', { name: 'Ada', email: 'ada@x.com' })).resolves.toBeUndefined();
  });
});
