import { AdminIbCampaignsService } from './admin-ib-campaigns.service';

// Constructor order: (prisma, audit).
describe('AdminIbCampaignsService', () => {
  it('lists ordered by sortOrder then createdAt', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new AdminIbCampaignsService({ ibCampaign: { findMany } } as any, {} as any);
    await service.list();
    expect(findMany).toHaveBeenCalledWith({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  });

  it('create uppercases the code and audits it', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'c1', code: 'IB-YT' });
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new AdminIbCampaignsService({ ibCampaign: { create } } as any, { record } as any);
    await service.create('admin1', { name: 'YT', code: 'ib-yt' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ code: 'IB-YT', enabled: true }) }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'ib.campaign.create', entityId: 'c1' }));
  });

  it('remove throws NotFound for an unknown campaign', async () => {
    const prisma = { ibCampaign: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new AdminIbCampaignsService(prisma, {} as any);
    await expect(service.remove('admin1', 'nope')).rejects.toThrow('IB campaign not found');
  });
});
