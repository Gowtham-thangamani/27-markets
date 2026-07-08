import { AdminKycFieldsService } from './admin-kyc-fields.service';

// Constructor order: (prisma, audit).
describe('AdminKycFieldsService', () => {
  it('lists by kind', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new AdminKycFieldsService({ kycFieldDefinition: { findMany } } as any, {} as any);

    await service.list('QUESTION');

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { kind: 'QUESTION' } }));
  });

  it('create defaults type/required/enabled and audits it', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'f1', kind: 'EXTENDED', label: 'Occupation' });
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new AdminKycFieldsService({ kycFieldDefinition: { create } } as any, { record } as any);

    await service.create('admin1', { kind: 'EXTENDED', label: 'Occupation' });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ kind: 'EXTENDED', label: 'Occupation', fieldType: 'TEXT', required: false, enabled: true }) }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'kyc.field.create', entityId: 'f1' }));
  });

  it('remove throws NotFound for an unknown field', async () => {
    const prisma = { kycFieldDefinition: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new AdminKycFieldsService(prisma, {} as any);
    await expect(service.remove('admin1', 'nope')).rejects.toThrow('KYC field not found');
  });
});
