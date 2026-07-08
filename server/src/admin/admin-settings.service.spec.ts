import { AdminSettingsService } from './admin-settings.service';

// Constructor order: (prisma, audit).
describe('AdminSettingsService', () => {
  it('lists settings ordered by group then sortOrder', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new AdminSettingsService({ appSetting: { findMany } } as any, {} as any);

    await service.list();

    expect(findMany).toHaveBeenCalledWith({ orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }] });
  });

  it('update writes each key via updateMany and audits the batch', async () => {
    const updateMany = jest.fn().mockReturnValue('op');
    const $transaction = jest.fn().mockResolvedValue([]);
    const findMany = jest.fn().mockResolvedValue([]);
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = { appSetting: { updateMany, findMany }, $transaction } as any;
    const service = new AdminSettingsService(prisma, { record } as any);

    await service.update('admin1', { updates: [{ key: 'company_name', value: 'New Co' }] });

    expect(updateMany).toHaveBeenCalledWith({ where: { key: 'company_name' }, data: { value: 'New Co' } });
    expect($transaction).toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'settings.update', metadata: { keys: ['company_name'] } }));
  });
});
