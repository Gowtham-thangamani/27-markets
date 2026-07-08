import { AdminCampaignsService } from './admin-campaigns.service';

// Constructor order: (prisma, audit).
describe('AdminCampaignsService', () => {
  it('lists newest first', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new AdminCampaignsService({ campaign: { findMany } } as any, {} as any);
    await service.list();
    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
  });

  it('create defaults channel/status and audits it', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'c1', name: 'Promo' });
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new AdminCampaignsService({ campaign: { create } } as any, { record } as any);
    await service.create('admin1', { name: 'Promo', message: 'hi' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: 'Promo', channel: 'EMAIL', status: 'DRAFT' }) }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'campaign.create', entityId: 'c1' }));
  });

  it('remove throws NotFound for an unknown campaign', async () => {
    const prisma = { campaign: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new AdminCampaignsService(prisma, {} as any);
    await expect(service.remove('admin1', 'nope')).rejects.toThrow('Campaign not found');
  });
});
