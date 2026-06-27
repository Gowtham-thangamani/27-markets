import { AdminDashboardService } from './admin-dashboard.service';

function makePrisma() {
  return {
    user: {
      count: jest.fn().mockResolvedValue(12),
      findMany: jest.fn().mockResolvedValue([
        { id: 'u1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.io', country: 'UK', createdAt: new Date('2026-03-05T10:00:00Z') },
      ]),
    },
    kycProfile: {
      count: jest.fn().mockResolvedValue(3),
      findMany: jest.fn().mockResolvedValue([
        { identityStatus: 'APPROVED', addressStatus: 'PENDING', selfieStatus: 'NOT_SUBMITTED' },
        { identityStatus: 'APPROVED', addressStatus: 'APPROVED', selfieStatus: 'APPROVED' },
      ]),
    },
    journalEntry: {
      // pendingWithdrawals count, depositsToday count, then findMany calls
      count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(5),
      findMany: jest.fn().mockResolvedValue([]), // deposits, withdrawals, recentWithdrawals series queries → empty
    },
    ticket: { count: jest.fn().mockResolvedValue(4) },
    lead: { groupBy: jest.fn().mockResolvedValue([{ status: 'NEW', _count: { _all: 6 } }]) },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'a1', action: 'funds.withdraw', entity: 'JournalEntry', createdAt: new Date('2026-03-05T09:00:00Z'), user: { firstName: 'Avery', lastName: 'Stone' } },
      ]),
    },
  } as any;
}

describe('AdminDashboardService.summary', () => {
  it('returns KPIs, a 90-day series, distributions, and recents', async () => {
    const service = new AdminDashboardService(makePrisma());
    const r = await service.summary();

    expect(r.kpis.totalClients.value).toBe(12);
    expect(r.kpis.pendingWithdrawals.value).toBe(2);
    expect(r.kpis.openTickets.value).toBe(4);
    expect(typeof r.kpis.netFlow.value).toBe('string'); // money string
    expect(r.series).toHaveLength(90);
    expect(r.series[89].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.distributions.funnel.NEW).toBe(6);
    expect(r.distributions.kyc.PENDING).toBe(1);
    expect(r.distributions.kyc.APPROVED).toBe(1);
    expect(r.recentSignups[0]).toMatchObject({ name: 'Ada Lovelace', email: 'ada@x.io' });
    expect(r.recentActivity[0]).toMatchObject({ action: 'funds.withdraw', actor: 'Avery Stone' });
  });
});
