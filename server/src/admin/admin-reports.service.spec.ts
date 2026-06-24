import { Prisma } from '@prisma/client';
import { AdminReportsService } from './admin-reports.service';

describe('AdminReportsService.summary', () => {
  it('computes deposits, withdrawals, net flow, and the lead funnel', async () => {
    const prisma = {
      posting: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(1000) } }) // deposits
          .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(300) } }), // withdrawals
      },
      lead: {
        groupBy: jest.fn().mockResolvedValue([
          { status: 'NEW', _count: { _all: 4 } },
          { status: 'CONVERTED', _count: { _all: 2 } },
        ]),
      },
      user: { count: jest.fn().mockResolvedValue(7) },
    } as any;
    const service = new AdminReportsService(prisma);

    const result = await service.summary();

    expect(result.deposits).toBe('1000.00');
    expect(result.withdrawals).toBe('300.00');
    expect(result.netFlow).toBe('700.00');
    expect(result.totalClients).toBe(7);
    expect(result.funnel.NEW).toBe(4);
    expect(result.funnel.CONVERTED).toBe(2);
    expect(result.funnel.LOST).toBe(0); // statuses with no rows default to 0
  });

  it('treats null aggregate sums as zero', async () => {
    const prisma = {
      posting: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }) },
      lead: { groupBy: jest.fn().mockResolvedValue([]) },
      user: { count: jest.fn().mockResolvedValue(0) },
    } as any;
    const service = new AdminReportsService(prisma);

    const result = await service.summary();

    expect(result.deposits).toBe('0.00');
    expect(result.netFlow).toBe('0.00');
  });
});
