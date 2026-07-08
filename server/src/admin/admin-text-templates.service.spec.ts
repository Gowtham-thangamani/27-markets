import { AdminTextTemplatesService } from './admin-text-templates.service';

// Constructor order: (prisma, audit).
describe('AdminTextTemplatesService', () => {
  it('lists by kind', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new AdminTextTemplatesService({ textTemplate: { findMany } } as any, {} as any);
    await service.list('PDF');
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { kind: 'PDF' } }));
  });

  it('create defaults enabled and audits it', async () => {
    const create = jest.fn().mockResolvedValue({ id: 't1', kind: 'COMMENT', name: 'Follow-up' });
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new AdminTextTemplatesService({ textTemplate: { create } } as any, { record } as any);
    await service.create('admin1', { kind: 'COMMENT', name: 'Follow-up', body: 'hi' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ kind: 'COMMENT', name: 'Follow-up', enabled: true }) }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'templates.text.create', entityId: 't1' }));
  });

  it('remove throws NotFound for an unknown template', async () => {
    const prisma = { textTemplate: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new AdminTextTemplatesService(prisma, {} as any);
    await expect(service.remove('admin1', 'nope')).rejects.toThrow('Template not found');
  });
});
