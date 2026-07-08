import { AdminDataChangeRequestsService } from './admin-data-change-requests.service';

// Constructor order: (prisma, audit).
describe('AdminDataChangeRequestsService', () => {
  it('approve applies the requested value to the user and marks APPROVED', async () => {
    const $transaction = jest.fn().mockResolvedValue([]);
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      dataChangeRequest: {
        findUnique: jest.fn().mockResolvedValue({ id: 'r1', userId: 'u1', field: 'phone', requestedValue: '+123', status: 'PENDING' }),
        update: jest.fn(),
      },
      user: { update: jest.fn() },
      $transaction,
    } as any;
    const service = new AdminDataChangeRequestsService(prisma, { record } as any);

    const res = await service.approve('admin1', 'r1');

    expect($transaction).toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'data-change.approve', entityId: 'r1' }));
    expect(res).toEqual({ ok: true, status: 'APPROVED' });
  });

  it('approve refuses a non-changeable field', async () => {
    const prisma = {
      dataChangeRequest: { findUnique: jest.fn().mockResolvedValue({ id: 'r1', userId: 'u1', field: 'email', requestedValue: 'x@y.com', status: 'PENDING' }) },
    } as any;
    const service = new AdminDataChangeRequestsService(prisma, {} as any);
    await expect(service.approve('admin1', 'r1')).rejects.toThrow('cannot be changed');
  });

  it('reject marks REJECTED and audits the reason', async () => {
    const update = jest.fn();
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      dataChangeRequest: { findUnique: jest.fn().mockResolvedValue({ id: 'r1', status: 'PENDING' }), update },
    } as any;
    const service = new AdminDataChangeRequestsService(prisma, { record } as any);

    const res = await service.reject('admin1', 'r1', 'invalid');

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'r1' }, data: expect.objectContaining({ status: 'REJECTED' }) }));
    expect(res.status).toBe('REJECTED');
  });
});
