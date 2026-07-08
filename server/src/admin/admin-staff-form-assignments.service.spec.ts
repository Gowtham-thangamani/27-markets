import { AdminStaffFormAssignmentsService } from './admin-staff-form-assignments.service';

// Constructor order: (prisma, audit).
describe('AdminStaffFormAssignmentsService', () => {
  it('enriches assignments with form + staff names', async () => {
    const prisma = {
      staffFormAssignment: { findMany: jest.fn().mockResolvedValue([{ id: 'a1', kycFormId: 'f1', staffId: 's1', createdAt: new Date() }]) },
      kycForm: { findMany: jest.fn().mockResolvedValue([{ id: 'f1', name: 'Individual' }]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 's1', firstName: 'Riley', lastName: 'Mensah', role: 'AGENT' }]) },
    } as any;
    const service = new AdminStaffFormAssignmentsService(prisma, {} as any);

    const rows = await service.list();

    expect(rows[0]).toMatchObject({ formName: 'Individual', staffName: 'Riley Mensah', staffRole: 'AGENT' });
  });

  it('rejects assigning to a non-staff user', async () => {
    const prisma = {
      kycForm: { findUnique: jest.fn().mockResolvedValue({ id: 'f1' }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', role: 'CLIENT' }) },
    } as any;
    const service = new AdminStaffFormAssignmentsService(prisma, {} as any);
    await expect(service.create('admin1', { kycFormId: 'f1', staffId: 'u1' })).rejects.toThrow('Assignee must be a staff member');
  });

  it('remove throws NotFound for an unknown assignment', async () => {
    const prisma = { staffFormAssignment: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new AdminStaffFormAssignmentsService(prisma, {} as any);
    await expect(service.remove('admin1', 'nope')).rejects.toThrow('Assignment not found');
  });
});
