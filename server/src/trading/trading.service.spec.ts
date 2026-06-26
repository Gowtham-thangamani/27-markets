import { Prisma } from '@prisma/client';
import { TradingService } from './trading.service';

// Constructor order: (prisma, ledger, audit, exec, market)
const simExec = (price: number) => ({
  name: 'simulation',
  simulated: true,
  assertAvailable: jest.fn(),
  fill: jest.fn().mockResolvedValue({ price, simulated: true }),
});
const ledgerWith = (balance: number) => ({ balanceOf: jest.fn().mockResolvedValue(balance), getSystemAccount: jest.fn().mockResolvedValue({ id: 'adj' }), post: jest.fn() });
const marketWith = (quotes: { symbol: string; price: number }[] = []) => ({ getQuotes: jest.fn().mockResolvedValue(quotes) });
const audit = () => ({ record: jest.fn() });

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
    const service = new TradingService(prisma, ledgerWith(50000) as any, audit() as any, exec as any, marketWith() as any);

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
    const service = new TradingService(prisma, ledgerWith(100) as any, audit() as any, simExec(1000) as any, marketWith() as any);
    await expect(
      service.placeOrder('u1', { accountId: 'acc1', symbol: 'X', side: 'BUY', quantity: 1 } as any),
    ).rejects.toThrow('Insufficient free margin');
  });

  it('refuses simulated trading on a non-demo account', async () => {
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', mode: 'LIVE', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
    } as any;
    const service = new TradingService(prisma, ledgerWith(50000) as any, audit() as any, simExec(100) as any, marketWith() as any);
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
    const service = new TradingService(prisma, ledgerWith(50000) as any, audit() as any, exec as any, marketWith() as any);

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
    const service = new TradingService(prisma, ledgerWith(50000) as any, audit() as any, simExec(100) as any, marketWith() as any);
    await expect(
      service.placeOrder('u1', { accountId: 'acc1', symbol: 'X', side: 'BUY', quantity: 1, type: 'STOP' } as any),
    ).rejects.toThrow('trigger price is required');
  });
});

describe('TradingService trigger/protection math', () => {
  it('isTriggered matches limit and stop conditions', () => {
    expect(TradingService.isTriggered('LIMIT' as any, 'BUY' as any, 100, 99)).toBe(true);
    expect(TradingService.isTriggered('LIMIT' as any, 'BUY' as any, 100, 101)).toBe(false);
    expect(TradingService.isTriggered('STOP' as any, 'BUY' as any, 100, 101)).toBe(true);
    expect(TradingService.isTriggered('STOP' as any, 'SELL' as any, 100, 99)).toBe(true);
  });

  it('take-profit / stop-loss hit conditions', () => {
    expect(TradingService.hitsTakeProfit('BUY' as any, 120, 121)).toBe(true);
    expect(TradingService.hitsTakeProfit('BUY' as any, 120, 119)).toBe(false);
    expect(TradingService.hitsTakeProfit('SELL' as any, 80, 79)).toBe(true);
    expect(TradingService.hitsStopLoss('BUY' as any, 90, 89)).toBe(true);
    expect(TradingService.hitsStopLoss('SELL' as any, 110, 111)).toBe(true);
    expect(TradingService.hitsStopLoss('BUY' as any, 90, 91)).toBe(false);
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
    const service = new TradingService(prisma, ledgerWith(0) as any, audit() as any, simExec(1) as any, marketWith() as any);
    const res = await service.cancelOrder('u1', 'po1');
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'po1' }, data: { status: 'CANCELLED' } });
    expect(res.status).toBe('CANCELLED');
  });
});

describe('TradingService.setProtection', () => {
  it('sets take-profit / stop-loss on an open position', async () => {
    const prisma = {
      position: {
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', userId: 'u1', status: 'OPEN' }),
        update: jest.fn().mockResolvedValue({ id: 'p1', takeProfit: 120 }),
      },
    } as any;
    const service = new TradingService(prisma, ledgerWith(0) as any, audit() as any, simExec(1) as any, marketWith() as any);
    await service.setProtection('u1', 'p1', { takeProfit: 120, stopLoss: 90 } as any);
    expect(prisma.position.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { takeProfit: 120, stopLoss: 90 } });
  });
});

describe('TradingService.closePosition', () => {
  const openPos = () => ({
    id: 'p1', userId: 'u1', accountId: 'acc1', symbol: 'X', side: 'BUY',
    quantity: new Prisma.Decimal(2), entryPrice: new Prisma.Decimal(100), status: 'OPEN', realizedPnl: null,
  });
  const basePrisma = (pos: any) => ({
    position: { findUnique: jest.fn().mockResolvedValue(pos), update: jest.fn().mockImplementation(({ data }) => ({ id: 'p1', ...data })) },
    tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', mode: 'DEMO', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
    order: { create: jest.fn().mockResolvedValue({}) },
  });

  it('full close realizes P&L and marks the position CLOSED (BUY in profit)', async () => {
    const prisma = basePrisma(openPos()) as any;
    const ledger = ledgerWith(1000);
    const service = new TradingService(prisma, ledger as any, audit() as any, simExec(110) as any, marketWith() as any);

    const res = await service.closePosition('u1', 'p1');

    expect(prisma.position.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CLOSED', exitPrice: 110 }) }),
    );
    const postings = ledger.post.mock.calls[0][0].postings;
    expect(postings.map((p: any) => [p.ledgerAccountId, p.direction])).toEqual([['adj', 'DEBIT'], ['cl', 'CREDIT']]);
    expect(res.status).toBe('CLOSED');
  });

  it('partial close reduces quantity and keeps the position OPEN', async () => {
    const prisma = basePrisma(openPos()) as any;
    const service = new TradingService(prisma, ledgerWith(1000) as any, audit() as any, simExec(110) as any, marketWith() as any);

    await service.closePosition('u1', 'p1', 0.5); // close 0.5 of 2

    const data = prisma.position.update.mock.calls[0][0].data;
    expect(data.quantity).toBe(1.5);
    expect(data.status).toBeUndefined();
  });
});

describe('TradingService.marginSnapshot', () => {
  it('computes equity, used margin, and margin level from live prices', async () => {
    const prisma = {
      position: { findMany: jest.fn().mockResolvedValue([{ symbol: 'X', side: 'BUY', quantity: new Prisma.Decimal(10), entryPrice: new Prisma.Decimal(100) }]) },
    } as any;
    const service = new TradingService(prisma, ledgerWith(30) as any, audit() as any, simExec(1) as any, marketWith([{ symbol: 'X', price: 95 }]) as any);

    const snap = await service.marginSnapshot({ id: 'acc1', leverage: '1:100', ledgerAccount: { id: 'cl' } } as any);

    expect(snap.used).toBeCloseTo(10); // 100*10/100
    expect(snap.unrealized).toBeCloseTo(-50); // (95-100)*10
    expect(snap.equity).toBeCloseTo(-20); // 30 - 50
    expect(snap.marginLevel).toBeCloseTo(-200); // -20/10*100
  });
});
