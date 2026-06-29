import { Mt5ConnectionService } from './mt5-connection.service';

describe('Mt5ConnectionService', () => {
  it('stores PENDING (password discarded) when provisioning is not configured', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'm1' });
    const prisma = {
      mt5Connection: {
        upsert,
        findUnique: jest.fn().mockResolvedValue({ login: '123', server: 'X-Demo', status: 'PENDING', mt5AccountId: null, error: null, updatedAt: new Date() }),
      },
    } as any;
    const svc = new Mt5ConnectionService(prisma, { configured: false } as any, { record: jest.fn() } as any);

    const res = await svc.connect('u1', { login: '123', password: 'super-secret', server: 'X-Demo' } as any);

    const data = upsert.mock.calls[0][0];
    expect(data.create.status).toBe('PENDING');
    expect(JSON.stringify(data)).not.toContain('super-secret'); // never persisted
    expect(res?.status).toBe('PENDING');
  });

  it('provisions and marks CONNECTED when configured', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'm1' });
    const provisionAccount = jest.fn().mockResolvedValue({ id: 'acc-9' });
    const prisma = {
      mt5Connection: {
        upsert,
        findUnique: jest.fn().mockResolvedValue({ login: '123', server: 'X', status: 'CONNECTED', mt5AccountId: 'acc-9', error: null, updatedAt: new Date() }),
      },
    } as any;
    const svc = new Mt5ConnectionService(prisma, { configured: true, provisionAccount } as any, { record: jest.fn() } as any);

    const res = await svc.connect('u1', { login: '123', password: 'p', server: 'X' } as any);

    expect(provisionAccount).toHaveBeenCalled();
    expect(upsert.mock.calls[0][0].create.mt5AccountId).toBe('acc-9');
    expect(res?.status).toBe('CONNECTED');
  });

  it('accountIdFor returns the id only when CONNECTED', async () => {
    const prisma = { mt5Connection: { findUnique: jest.fn().mockResolvedValue({ status: 'CONNECTED', mt5AccountId: 'acc-9' }) } } as any;
    const svc = new Mt5ConnectionService(prisma, {} as any, {} as any);
    expect(await svc.accountIdFor('u1')).toBe('acc-9');
  });
});
