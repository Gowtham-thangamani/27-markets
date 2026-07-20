import { LeadSource, LeadStatus } from '@prisma/client';
import { LeadsService } from './leads.service';

// Constructor order: (prisma, audit, email, config)
const emailMock = () => ({
  sendLeadAlert: jest.fn().mockResolvedValue(undefined),
  sendWaitlistWelcome: jest.fn().mockResolvedValue(undefined),
});
const configMock = (notifyEmail = 'info@27markets.com') => ({
  get: jest.fn().mockReturnValue(notifyEmail),
});

describe('LeadsService.capture', () => {
  it('creates a new lead (default source DEMO, status NEW) and audits it', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'l1', source: LeadSource.DEMO, name: 'Ada', email: 'ada@x.com' });
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = { lead: { findFirst: jest.fn().mockResolvedValue(null), create } } as any;
    const service = new LeadsService(prisma, { record } as any, emailMock() as any, configMock() as any);

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
    const email = emailMock();
    const service = new LeadsService(prisma, { record: jest.fn() } as any, email as any, configMock() as any);

    const result = await service.capture({ name: 'Ada', email: 'ada@x.com' } as any);

    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'existing', deduped: true });
    // No fresh lead → no emails.
    expect(email.sendLeadAlert).not.toHaveBeenCalled();
    expect(email.sendWaitlistWelcome).not.toHaveBeenCalled();
  });

  it('alerts the configured team address on every fresh capture', async () => {
    const lead = { id: 'l1', source: LeadSource.DEMO, name: 'Ada', email: 'ada@x.com', phone: null, country: null, subject: null, message: null };
    const prisma = { lead: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(lead) } } as any;
    const email = emailMock();
    const service = new LeadsService(prisma, { record: jest.fn() } as any, email as any, configMock('team@27markets.com') as any);

    await service.capture({ name: 'Ada', email: 'ada@x.com' } as any);

    expect(email.sendLeadAlert).toHaveBeenCalledWith('team@27markets.com', lead);
    // DEMO is not a waitlist signup — no launch-list email.
    expect(email.sendWaitlistWelcome).not.toHaveBeenCalled();
  });

  it('sends a launch-list welcome to waitlist prospects (first name derived)', async () => {
    const lead = { id: 'l2', source: LeadSource.WAITLIST, name: 'Ada Lovelace', email: 'ada@x.com', phone: null, country: null, subject: null, message: null };
    const prisma = { lead: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(lead) } } as any;
    const email = emailMock();
    const service = new LeadsService(prisma, { record: jest.fn() } as any, email as any, configMock() as any);

    await service.capture({ name: 'Ada Lovelace', email: 'ada@x.com', source: LeadSource.WAITLIST } as any);

    expect(email.sendLeadAlert).toHaveBeenCalledWith('info@27markets.com', lead);
    expect(email.sendWaitlistWelcome).toHaveBeenCalledWith('ada@x.com', 'Ada');
  });

  it('never lets an email failure break capture', async () => {
    const lead = { id: 'l3', source: LeadSource.WAITLIST, name: 'Ada', email: 'ada@x.com', phone: null, country: null, subject: null, message: null };
    const prisma = { lead: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(lead) } } as any;
    const email = emailMock();
    email.sendLeadAlert.mockRejectedValue(new Error('smtp down'));
    email.sendWaitlistWelcome.mockRejectedValue(new Error('smtp down'));
    const service = new LeadsService(prisma, { record: jest.fn() } as any, email as any, configMock() as any);

    await expect(service.capture({ name: 'Ada', email: 'ada@x.com', source: LeadSource.WAITLIST } as any)).resolves.toEqual({ id: 'l3', deduped: false });
  });
});

describe('LeadsService.convertOnRegister', () => {
  const svc = (prisma: any) => new LeadsService(prisma, { record: jest.fn() } as any, emailMock() as any, configMock() as any);

  it('marks an existing lead CONVERTED and links the user', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      lead: { findFirst: jest.fn().mockResolvedValue({ id: 'l1' }), update, create: jest.fn() },
    } as any;
    const service = svc(prisma);

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
    const service = svc(prisma);

    await service.convertOnRegister('user1', { name: 'Ada', email: 'ada@x.com' });

    const data = create.mock.calls[0][0].data;
    expect(data.source).toBe(LeadSource.REGISTER);
    expect(data.status).toBe(LeadStatus.CONVERTED);
    expect(data.convertedUserId).toBe('user1');
  });

  it('never throws into the signup flow', async () => {
    const prisma = { lead: { findFirst: jest.fn().mockRejectedValue(new Error('db down')) } } as any;
    const service = svc(prisma);

    await expect(service.convertOnRegister('user1', { name: 'Ada', email: 'ada@x.com' })).resolves.toBeUndefined();
  });
});
