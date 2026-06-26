import { Prisma } from '@prisma/client';
import { TradingService } from './trading.service';

// Constructor order: (prisma, ledger, audit, exec)
const simExec = (price: number) => ({
  name: 'simulation',
  simulated: true,
  assertAvailable: jest.fn(),
  fill: jest.fn().mockResolvedValue({ price, simulated: true }),
});
const ledgerWith = (balance: number) => ({ balanceOf: jest.fn().mockResolvedValue(balance), getSystemAccount: jest.fn(), post: jest.fn() });

describe('TradingService.placeOrder (market)', () => {
  it('fills at the live price and opens a position (demo, margin ok)', async () => {
    const order = { create: jest.fn().mockResolvedValue({ id: 'o1' }) };
    const position = { create: jest.fn().mockResolvedValue({ id: 'p1', status: 'OPEN' }), findMany: jest.fn().mockResolvedValue([]) };
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', mode: 'DEMO', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
      order,
      position,
    } as any;
    const exec = simExec(100);
    const service = new TradingService(prisma, ledgerWith(50000) as any, { record: jest.fn() } as any, exec as any);

    await service.placeOrder('u1', { accountId: 'acc1', symbol: 'BINANCE:BTCUSDT', side: 'BUY', quantity: 0.5 } as any);

    expect(exec.fill).toHaveBeenCalledWith('BINANCE:BTCUSDT', 'BUY', 0.5);
    expect(position.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ entryPrice: 100, side: 'BUY', status: 'OPEN' }) }),
    );
  });

  it('rejects when required margin exceeds free margin', async () => {
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', mode: 'DEMO', leverage: '1:1', ledgerAccount: { id: 'cl' } }) },
      position: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const service = new TradingService(prisma, ledgerWith(100) as any, { record: jest.fn() } as any, simExec(1000) as any);
    // notional 1000 * 1 / leverage 1 = 1000 required vs 100 free
    await expect(
      service.placeOrder('u1', { accountId: 'acc1', symbol: 'X', side: 'BUY', quantity: 1 } as any),
    ).rejects.toThrow('Insufficient free margin');
  });

  it('refuses simulated trading on a non-demo account', async () => {
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', mode: 'LIVE', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
    } as any;
    const service = new TradingService(prisma, ledgerWith(50000) as any, {} as any, simExec(100) as any);
    await expect(
      service.placeOrder('u1', { accountId: 'acc1', symbol: 'X', side: 'BUY', quantity: 1 } as any),
    ).rejects.toThrow('Live trading requires a connected MT5 venue');
  });
});

describe('TradingService.placeOrder (limit/stop)', () => {
  it('parks a LIMIT order as PENDING without opening a position', async () => {
    const order = { create: jest.fn().mockResolvedValue({ id: 'po1', status: 'PENDING' }) };
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', mode: 'DEMO', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
      position: { findMany: jest.fn().mockResolvedValue([]) },
      order,
    } as any;
    const exec = simExec(100);
    const service = new TradingService(prisma, ledgerWith(50000) as any, { record: jest.fn() } as any, exec as any);

    const res = await service.placeOrder('u1', { accountId: 'acc1', symbol: 'X', side: 'BUY', quantity: 1, type: 'LIMIT', triggerPrice: 90 } as any);

    expect(exec.fill).not.toHaveBeenCalled();
    expect(order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', triggerPrice: 90, type: 'LIMIT' }) }),
    );
    expect(res.status).toBe('PENDING');
  });

  it('requires a trigger price for limit/stop', async () => {
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', mode: 'DEMO', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
      position: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const service = new TradingService(prisma, ledgerWith(50000) as any, { record: jest.fn() } as any, simExec(100) as any);
    await expect(
      service.placeOrder('u1', { accountId: 'acc1', symbol: 'X', side: 'BUY', quantity: 1, type: 'STOP' } as any),
    ).rejects.toThrow('trigger price is required');
  });
});

describe('TradingService.isTriggered', () => {
  it('matches limit and stop conditions', () => {
    expect(TradingService.isTriggered('LIMIT' as any, 'BUY' as any, 100, 99)).toBe(true);
    expect(TradingService.isTriggered('LIMIT' as any, 'BUY' as any, 100, 101)).toBe(false);
    expect(TradingService.isTriggered('LIMIT' as any, 'SELL' as any, 100, 101)).toBe(true);
    expect(TradingService.isTriggered('STOP' as any, 'BUY' as any, 100, 101)).toBe(true);
    expect(TradingService.isTriggered('STOP' as any, 'SELL' as any, 100, 99)).toBe(true);
    expect(TradingService.isTriggered('STOP' as any, 'SELL' as any, 100, 101)).toBe(false);
  });
});

describe('TradingService.cancelOrder', () => {
  it('cancels a pending order', async () => {
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({ id: 'po1', userId: 'u1', status: 'PENDING' }),
        update: jest.fn().mockResolvedValue({ id: 'po1', status: 'CANCELLED' }),
      },
    } as any;
    const service = new TradingService(prisma, ledgerWith(0) as any, { record: jest.fn() } as any, simExec(1) as any);
    const res = await service.cancelOrder('u1', 'po1');
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'po1' }, data: { status: 'CANCELLED' } });
    expect(res.status).toBe('CANCELLED');
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
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', mode: 'DEMO', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
      order: { create: jest.fn().mockResolvedValue({}) },
    } as any;
    const ledger = { getSystemAccount: jest.fn().mockResolvedValue({ id: 'adj' }), post, balanceOf: jest.fn() } as any;
    const exec = simExec(110); // exit 110, entry 100, qty 2, BUY → +20
    const service = new TradingService(prisma, ledger, { record: jest.fn() } as any, exec as any);

    const res = await service.closePosition('u1', 'p1');

    expect(prisma.position.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' }, data: expect.objectContaining({ status: 'CLOSED', exitPrice: 110 }) }),
    );
    const postings = post.mock.calls[0][0].postings;
    expect(postings.map((p: any) => [p.ledgerAccountId, p.direction])).toEqual([
      ['adj', 'DEBIT'],
      ['cl', 'CREDIT'],
    ]);
    expect(res.status).toBe('CLOSED');
  });
});
