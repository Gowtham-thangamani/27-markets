import { AdminServersService } from './admin-servers.service';

// Constructor order: (prisma, audit).
describe('AdminServersService', () => {
  it('lists servers ordered by sortOrder then createdAt', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new AdminServersService({ tradingServer: { findMany } } as any, {} as any);

    await service.list();

    expect(findMany).toHaveBeenCalledWith({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  });

  it('create defaults platform/environment/enabled and audits it', async () => {
    const create = jest.fn().mockResolvedValue({ id: 's1', name: 'Live' });
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new AdminServersService({ tradingServer: { create } } as any, { record } as any);

    await service.create('admin1', { name: 'Live', host: 'live.mt5' });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: 'Live', host: 'live.mt5', platform: 'MT5', environment: 'LIVE', enabled: true }) }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'trading.server.create', entityId: 's1' }));
  });

  it('remove throws NotFound for an unknown server', async () => {
    const prisma = { tradingServer: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new AdminServersService(prisma, {} as any);

    await expect(service.remove('admin1', 'nope')).rejects.toThrow('Server not found');
  });
});
