import { UserRole } from '@prisma/client';
import { AdminStaffService } from './admin-staff.service';

// Constructor order: (prisma, audit)

describe('AdminStaffService.setRole', () => {
  it('updates a user role to AGENT and audits the change', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'u2', role: UserRole.AGENT });
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u2', role: UserRole.ADMIN }), update },
    } as any;
    const service = new AdminStaffService(prisma, { record } as any);

    const result = await service.setRole('admin1', 'u2', UserRole.AGENT);

    expect(update).toHaveBeenCalledWith({ where: { id: 'u2' }, data: { role: UserRole.AGENT } });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'staff.role', metadata: { from: UserRole.ADMIN, to: UserRole.AGENT } }),
    );
    expect(result).toEqual({ id: 'u2', role: UserRole.AGENT });
  });

  it('rejects assigning a non-staff role', async () => {
    const service = new AdminStaffService({} as any, {} as any);
    await expect(service.setRole('admin1', 'u2', UserRole.CLIENT)).rejects.toThrow('Role must be ADMIN or AGENT');
  });

  it('prevents an admin from changing their own role', async () => {
    const service = new AdminStaffService({} as any, {} as any);
    await expect(service.setRole('admin1', 'admin1', UserRole.AGENT)).rejects.toThrow('cannot change your own role');
  });
});

describe('AdminStaffService.auditLog', () => {
  it('filters by action when provided', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new AdminStaffService({ auditLog: { findMany } } as any, {} as any);

    await service.auditLog('staff.role');

    expect(findMany.mock.calls[0][0].where).toEqual({ action: 'staff.role' });
  });
});
