import { AdminKycFormsService } from './admin-kyc-forms.service';
import { AdminConsentsService } from './admin-consents.service';

// Constructor order: (prisma, audit).
describe('AdminKycFormsService', () => {
  it('create defaults enabled and audits it', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'f1', name: 'Individual' });
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new AdminKycFormsService({ kycForm: { create } } as any, { record } as any);

    await service.create('admin1', { name: 'Individual' });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: 'Individual', enabled: true }) }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'kyc.form.create', entityId: 'f1' }));
  });

  it('remove throws NotFound for an unknown form', async () => {
    const prisma = { kycForm: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new AdminKycFormsService(prisma, {} as any);
    await expect(service.remove('admin1', 'nope')).rejects.toThrow('KYC form not found');
  });
});

describe('AdminConsentsService', () => {
  it('create defaults required/enabled and audits it', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'c1', label: 'Terms' });
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new AdminConsentsService({ consent: { create } } as any, { record } as any);

    await service.create('admin1', { label: 'Terms', body: 'Agree' });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ label: 'Terms', body: 'Agree', required: true, enabled: true }) }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'consent.create', entityId: 'c1' }));
  });

  it('remove throws NotFound for an unknown consent', async () => {
    const prisma = { consent: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new AdminConsentsService(prisma, {} as any);
    await expect(service.remove('admin1', 'nope')).rejects.toThrow('Consent not found');
  });
});
