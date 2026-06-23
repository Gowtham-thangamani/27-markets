import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService', () => {
  it('summary aggregates the five KPI counts', async () => {
    const prisma = {
      user: { count: jest.fn().mockResolvedValue(12) },
      kycProfile: { count: jest.fn().mockResolvedValue(3) },
      journalEntry: { count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(5) },
      ticket: { count: jest.fn().mockResolvedValue(4) },
    } as any;
    const service = new AdminDashboardService(prisma);

    const result = await service.summary();

    expect(result).toEqual({
      totalClients: 12,
      pendingKyc: 3,
      pendingWithdrawals: 2,
      depositsToday: 5,
      openTickets: 4,
    });
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: 'CLIENT' } });
    expect(prisma.ticket.count).toHaveBeenCalledWith({ where: { status: 'OPEN' } });
  });
});
