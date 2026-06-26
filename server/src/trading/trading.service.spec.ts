import { Prisma } from '@prisma/client';
import { TradingService } from './trading.service';

// Constructor order: (prisma, ledger, audit, exec)
const simExec = (price: number) => ({ name: 'simulation', simulated: true, assertAvailable: jest.fn(), fill: jest.fn().mockResolvedValue({ price, simulated: true }) });

describe('TradingService.openPosition', () => {
  it('fills at the live price and opens a position (demo account)', async () => {
    const order = { create: jest.fn().mockResolvedValue({ id: 'o1' }) };
    const position = { create: jest.fn().mockResolvedValue({ id: 'p1', status: 'OPEN' }) };
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', mode: 'DEMO', ledgerAccount: { id: 'cl' } }) },
      order,
      position,
    } as any;
    const exec = simExec(100);
    const service = new TradingService(prisma, {} as any, { record: jest.fn() } as any, exec as any);

    await service.openPosition('u1', { accountId: 'acc1', symbol: 'BINANCE:BTCUSDT', side: 'BUY', quantity: 0.5 } as any);

    expect(exec.fill).toHaveBeenCalledWith('BINANCE:BTCUSDT', 'BUY', 0.5);
    expect(position.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ entryPrice: 100, side: 'BUY', status: 'OPEN' }) }),
    );
  });

  it('refuses simulated trading on a non-demo account', async () => {
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', mode: 'LIVE', ledgerAccount: { id: 'cl' } }) },
    } as any;
    const service = new TradingService(prisma, {} as any, {} as any, simExec(100) as any);
    await expect(
      service.openPosition('u1', { accountId: 'acc1', symbol: 'X', side: 'BUY', quantity: 1 } as any),
    ).rejects.toThrow('Live trading requires a connected MT5 venue');
  });
});

describe('TradingService.closePosition', () => {
  it('computes realized P&L and posts it to the ledger (BUY in profit)', async () => {
    const post = jest.fn().mockResolvedValue({});
    const prisma = {
      position: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1', userId: 'u1', accountId: 'acc1', symbol: 'X', side: 'BUY',
          quantity: new Prisma.Decimal(2), entryPrice: new Prisma.Decimal(100), status: 'OPEN',
        }),
        update: jest.fn().mockResolvedValue({ id: 'p1', status: 'CLOSED' }),
      },
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', mode: 'DEMO', ledgerAccount: { id: 'cl' } }) },
      order: { create: jest.fn().mockResolvedValue({}) },
    } as any;
    const ledger = { getSystemAccount: jest.fn().mockResolvedValue({ id: 'adj' }), post } as any;
    const exec = simExec(110); // exit 110, entry 100, qty 2, BUY → +20
    const service = new TradingService(prisma, ledger, { record: jest.fn() } as any, exec as any);

    const res = await service.closePosition('u1', 'p1');

    expect(prisma.position.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' }, data: expect.objectContaining({ status: 'CLOSED', exitPrice: 110 }) }),
    );
    // +20 profit → CREDIT client, DEBIT adjustments
    const postings = post.mock.calls[0][0].postings;
    expect(postings.map((p: any) => [p.ledgerAccountId, p.direction])).toEqual([
      ['adj', 'DEBIT'],
      ['cl', 'CREDIT'],
    ]);
    expect(res.status).toBe('CLOSED');
  });
});
