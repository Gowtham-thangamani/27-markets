import { AdminPaymentGatewaysService } from './admin-payment-gateways.service';

// Constructor order: (prisma, audit).
describe('AdminPaymentGatewaysService', () => {
  it('lists gateways ordered by sortOrder then createdAt', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new AdminPaymentGatewaysService({ paymentGateway: { findMany } } as any, {} as any);

    await service.list();

    expect(findMany).toHaveBeenCalledWith({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  });

  it('create defaults enabled=true and audits it', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'g1', name: 'Bank' });
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new AdminPaymentGatewaysService({ paymentGateway: { create } } as any, { record } as any);

    await service.create('admin1', { name: 'Bank', type: 'BANK' as any });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: 'Bank', type: 'BANK', enabled: true }) }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'payments.gateway.create', entityId: 'g1' }));
  });

  it('update applies only provided fields', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'g1', enabled: false });
    const prisma = { paymentGateway: { findUnique: jest.fn().mockResolvedValue({ id: 'g1' }), update } } as any;
    const service = new AdminPaymentGatewaysService(prisma, { record: jest.fn() } as any);

    await service.update('admin1', 'g1', { enabled: false });

    expect(update).toHaveBeenCalledWith({ where: { id: 'g1' }, data: { enabled: false } });
  });

  it('remove deletes an existing gateway and audits it', async () => {
    const del = jest.fn().mockResolvedValue({});
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = { paymentGateway: { findUnique: jest.fn().mockResolvedValue({ id: 'g1' }), delete: del } } as any;
    const service = new AdminPaymentGatewaysService(prisma, { record } as any);

    const res = await service.remove('admin1', 'g1');

    expect(del).toHaveBeenCalledWith({ where: { id: 'g1' } });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'payments.gateway.delete', entityId: 'g1' }));
    expect(res).toEqual({ ok: true });
  });

  it('remove throws NotFound for an unknown gateway', async () => {
    const prisma = { paymentGateway: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new AdminPaymentGatewaysService(prisma, {} as any);

    await expect(service.remove('admin1', 'nope')).rejects.toThrow('Payment gateway not found');
  });
});
