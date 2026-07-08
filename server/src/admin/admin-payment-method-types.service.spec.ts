import { AdminPaymentMethodTypesService } from './admin-payment-method-types.service';

// Constructor order: (prisma, audit).
describe('AdminPaymentMethodTypesService', () => {
  it('lists by category', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new AdminPaymentMethodTypesService({ paymentMethodType: { findMany } } as any, {} as any);

    await service.list('CARD');

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { category: 'CARD' } }));
  });

  it('create defaults enabled and audits it', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'm1', category: 'EWALLET', name: 'Skrill' });
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new AdminPaymentMethodTypesService({ paymentMethodType: { create } } as any, { record } as any);

    await service.create('admin1', { category: 'EWALLET', name: 'Skrill' });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ category: 'EWALLET', name: 'Skrill', enabled: true }) }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'payments.method-type.create', entityId: 'm1' }));
  });

  it('remove throws NotFound for an unknown item', async () => {
    const prisma = { paymentMethodType: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new AdminPaymentMethodTypesService(prisma, {} as any);

    await expect(service.remove('admin1', 'nope')).rejects.toThrow('Payment method type not found');
  });
});
