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
const marketWith = (quotes: { symbol: string; price: number }[] = []) => ({ getQuotes: jest.fn().mockResolvedValue(quotes), isTradable: jest.fn().mockReturnValue(true) });
const mt5conn = () => ({ accountIdFor: jest.fn().mockResolvedValue(undefined) });
const audit = () => ({ record: jest.fn() });

describe('TradingService.placeOrder (market)', () => {
  it('fills at the live price and opens a position (demo, margin ok)', async () => {
    const txClient = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'cl' }]),
      order: { create: jest.fn().mockResolvedValue({ id: 'o1' }) },
      position: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'p1', status: 'OPEN' }) },
    };
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', status: 'ACTIVE', mode: 'DEMO', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
      $transaction: jest.fn().mockImplementation((cb: any) => cb(txClient)),
    } as any;
    const exec = simExec(100);
    const service = new TradingService(prisma, ledgerWith(50000) as any, audit() as any, exec as any, marketWith() as any, mt5conn() as any);

    await service.placeOrder('u1', { accountId: 'acc1', symbol: 'BINANCE:BTCUSDT', side: 'BUY', quantity: 0.5 } as any);

    expect(exec.fill).toHaveBeenCalledWith('BINANCE:BTCUSDT', 'BUY', 0.5, undefined);
    expect(txClient.position.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ entryPrice: 100, side: 'BUY', status: 'OPEN' }) }),
    );
  });

  it('opens a market position atomically under an account row lock (H-6)', async () => {
    const txClient = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'cl' }]),
      order: { create: jest.fn().mockResolvedValue({ id: 'o1' }) },
      position: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'p1', status: 'OPEN' }) },
    };
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', status: 'ACTIVE', mode: 'DEMO', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
      $transaction: jest.fn().mockImplementation((cb: any) => cb(txClient)),
    } as any;
    const service = new TradingService(prisma, ledgerWith(50000) as any, audit() as any, simExec(100) as any, marketWith() as any, mt5conn() as any);

    await service.placeOrder('u1', { accountId: 'acc1', symbol: 'X', side: 'BUY', quantity: 0.5 } as any);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(txClient.$queryRaw).toHaveBeenCalled(); // FOR UPDATE lock on the ledger account
    expect(txClient.position.create).toHaveBeenCalledTimes(1);
  });

  it('rejects when required margin exceeds free margin', async () => {
    const txClient = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'cl' }]),
      order: { create: jest.fn() },
      position: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    };
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', status: 'ACTIVE', mode: 'DEMO', leverage: '1:1', ledgerAccount: { id: 'cl' } }) },
      $transaction: jest.fn().mockImplementation((cb: any) => cb(txClient)),
    } as any;
    const service = new TradingService(prisma, ledgerWith(100) as any, audit() as any, simExec(1000) as any, marketWith() as any, mt5conn() as any);
    await expect(
      service.placeOrder('u1', { accountId: 'acc1', symbol: 'X', side: 'BUY', quantity: 1 } as any),
    ).rejects.toThrow('Insufficient free margin');
  });

  it('refuses simulated trading on a non-demo account', async () => {
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', status: 'ACTIVE', mode: 'LIVE', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
    } as any;
    const service = new TradingService(prisma, ledgerWith(50000) as any, audit() as any, simExec(100) as any, marketWith() as any, mt5conn() as any);
    await expect(
      service.placeOrder('u1', { accountId: 'acc1', symbol: 'X', side: 'BUY', quantity: 1 } as any),
    ).rejects.toThrow('Live trading requires a connected MT5 venue');
  });
});

describe('TradingService.placeOrder — symbol allowlist (M-3)', () => {
  it('rejects an order for a symbol outside the tradable universe', async () => {
    const market = { getQuotes: jest.fn().mockResolvedValue([]), isTradable: jest.fn().mockReturnValue(false) };
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', status: 'ACTIVE', mode: 'DEMO', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
    } as any;
    const service = new TradingService(prisma, ledgerWith(50000) as any, audit() as any, simExec(100) as any, market as any, mt5conn() as any);

    await expect(
      service.placeOrder('u1', { accountId: 'acc1', symbol: 'FAKE:SCAMCOIN', side: 'BUY', quantity: 1 } as any),
    ).rejects.toThrow(/not a tradable instrument/i);
    expect(market.isTradable).toHaveBeenCalledWith('FAKE:SCAMCOIN');
  });
});

describe('TradingService — DEMO always uses the simulated venue (H-4)', () => {
  it('routes a DEMO market order through the simulated provider, never the live exec', async () => {
    const liveExec = { name: 'mt5', simulated: false, assertAvailable: jest.fn(), fill: jest.fn().mockResolvedValue({ price: 100, simulated: false }) };
    const simProvider = { name: 'simulation', simulated: true, assertAvailable: jest.fn(), fill: jest.fn().mockResolvedValue({ price: 100, simulated: true }) };
    const txClient = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'cl' }]),
      order: { create: jest.fn().mockResolvedValue({}) },
      position: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'p1', status: 'OPEN' }) },
    };
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', status: 'ACTIVE', mode: 'DEMO', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
      $transaction: jest.fn().mockImplementation((cb: any) => cb(txClient)),
    } as any;
    const service = new TradingService(prisma, ledgerWith(50000) as any, audit() as any, liveExec as any, marketWith() as any, mt5conn() as any, simProvider as any);

    await service.placeOrder('u1', { accountId: 'acc1', symbol: 'X', side: 'BUY', quantity: 1 } as any);

    expect(simProvider.fill).toHaveBeenCalledTimes(1);
    expect(liveExec.fill).not.toHaveBeenCalled(); // a demo trade must never hit the live venue
  });

  it('rejects a LIVE account when only a simulated venue is available', async () => {
    const simProvider = { name: 'simulation', simulated: true, assertAvailable: jest.fn(), fill: jest.fn() };
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', status: 'ACTIVE', mode: 'LIVE', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
    } as any;
    const service = new TradingService(prisma, ledgerWith(50000) as any, audit() as any, simProvider as any, marketWith() as any, mt5conn() as any, simProvider as any);

    await expect(
      service.placeOrder('u1', { accountId: 'acc1', symbol: 'X', side: 'BUY', quantity: 1 } as any),
    ).rejects.toThrow('Live trading requires');
  });
});

describe('TradingService.placeOrder (limit/stop)', () => {
  it('parks a LIMIT order as PENDING without opening a position', async () => {
    const order = { create: jest.fn().mockResolvedValue({ id: 'po1', status: 'PENDING' }) };
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', status: 'ACTIVE', mode: 'DEMO', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
      position: { findMany: jest.fn().mockResolvedValue([]) },
      order,
    } as any;
    const exec = simExec(100);
    const service = new TradingService(prisma, ledgerWith(50000) as any, audit() as any, exec as any, marketWith() as any, mt5conn() as any);

    const res = await service.placeOrder('u1', { accountId: 'acc1', symbol: 'X', side: 'BUY', quantity: 1, type: 'LIMIT', triggerPrice: 90 } as any);

    expect(exec.fill).not.toHaveBeenCalled();
    expect(order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', triggerPrice: 90, type: 'LIMIT' }) }),
    );
    expect(res.status).toBe('PENDING');
  });

  it('requires a trigger price for limit/stop', async () => {
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', status: 'ACTIVE', mode: 'DEMO', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
      position: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const service = new TradingService(prisma, ledgerWith(50000) as any, audit() as any, simExec(100) as any, marketWith() as any, mt5conn() as any);
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
    const service = new TradingService(prisma, ledgerWith(0) as any, audit() as any, simExec(1) as any, marketWith() as any, mt5conn() as any);
    const res = await service.cancelOrder('u1', 'po1');
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'po1' }, data: { status: 'CANCELLED' } });
    expect(res.status).toBe('CANCELLED');
  });
});

describe('TradingService.setProtection', () => {
  it('sets take-profit / stop-loss on an open position', async () => {
    const prisma = {
      position: {
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', userId: 'u1', status: 'OPEN', side: 'BUY', entryPrice: new Prisma.Decimal(100) }),
        update: jest.fn().mockResolvedValue({ id: 'p1', takeProfit: 120 }),
      },
    } as any;
    const service = new TradingService(prisma, ledgerWith(0) as any, audit() as any, simExec(1) as any, marketWith() as any, mt5conn() as any);
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
    position: {
      findUnique: jest.fn().mockResolvedValue(pos),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockImplementation(({ data }) => ({ id: 'p1', ...data })),
    },
    tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', status: 'ACTIVE', mode: 'DEMO', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
    order: { create: jest.fn().mockResolvedValue({}) },
  });

  it('full close realizes P&L and marks the position CLOSED (BUY in profit)', async () => {
    const prisma = basePrisma(openPos()) as any;
    const ledger = ledgerWith(1000);
    const service = new TradingService(prisma, ledger as any, audit() as any, simExec(110) as any, marketWith() as any, mt5conn() as any);

    const res = await service.closePosition('u1', 'p1');

    expect(prisma.position.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'p1', status: 'OPEN' }), data: expect.objectContaining({ status: 'CLOSED' }) }),
    );
    expect(prisma.position.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ exitPrice: 110 }) }),
    );
    const postings = ledger.post.mock.calls[0][0].postings;
    expect(postings.map((p: any) => [p.ledgerAccountId, p.direction])).toEqual([['adj', 'DEBIT'], ['cl', 'CREDIT']]);
    expect(res.status).toBe('CLOSED');
  });

  it('partial close reduces quantity and keeps the position OPEN', async () => {
    const prisma = basePrisma(openPos()) as any;
    const service = new TradingService(prisma, ledgerWith(1000) as any, audit() as any, simExec(110) as any, marketWith() as any, mt5conn() as any);

    await service.closePosition('u1', 'p1', 0.5); // close 0.5 of 2

    const data = prisma.position.update.mock.calls[0][0].data;
    expect(data.quantity).toBe(1.5);
    expect(data.status).toBeUndefined();
  });
});

describe('TradingService.closePosition — concurrency guard (C-2)', () => {
  const openPos = () => ({
    id: 'p1', userId: 'u1', accountId: 'acc1', symbol: 'X', side: 'BUY',
    quantity: new Prisma.Decimal(2), entryPrice: new Prisma.Decimal(100), status: 'OPEN', realizedPnl: null,
  });
  const account = { id: 'acc1', userId: 'u1', status: 'ACTIVE', mode: 'DEMO', leverage: '1:500', ledgerAccount: { id: 'cl' } };

  it('does not fill or post P&L when a concurrent request already claimed the close', async () => {
    const ledger = ledgerWith(1000);
    const exec = simExec(110);
    const prisma = {
      position: {
        findUnique: jest.fn().mockResolvedValue(openPos()),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }), // lost the race
        update: jest.fn(),
      },
      tradingAccount: { findUnique: jest.fn().mockResolvedValue(account) },
      order: { create: jest.fn() },
    } as any;
    const service = new TradingService(prisma, ledger as any, audit() as any, exec as any, marketWith() as any, mt5conn() as any);

    await expect(service.closePosition('u1', 'p1')).rejects.toThrow('already closed');
    expect(exec.fill).not.toHaveBeenCalled();
    expect(ledger.post).not.toHaveBeenCalled();
    expect(prisma.position.update).not.toHaveBeenCalled();
  });

  it('claims OPEN→CLOSED atomically and posts P&L once with a deterministic key', async () => {
    const ledger = ledgerWith(1000);
    const exec = simExec(110);
    const prisma = {
      position: {
        findUnique: jest.fn().mockResolvedValue(openPos()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }), // won the race
        update: jest.fn().mockImplementation(({ data }) => ({ id: 'p1', ...data })),
      },
      tradingAccount: { findUnique: jest.fn().mockResolvedValue(account) },
      order: { create: jest.fn().mockResolvedValue({}) },
    } as any;
    const service = new TradingService(prisma, ledger as any, audit() as any, exec as any, marketWith() as any, mt5conn() as any);

    const res = await service.closePosition('u1', 'p1');

    expect(prisma.position.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'p1', status: 'OPEN' }) }),
    );
    expect(ledger.post).toHaveBeenCalledTimes(1);
    expect(ledger.post.mock.calls[0][0].idempotencyKey).toBe('pnl:p1:close');
    expect(res.status).toBe('CLOSED');
  });

  it('reverts the position to OPEN if the fill fails after claiming', async () => {
    const ledger = ledgerWith(1000);
    const exec = { name: 'simulation', simulated: true, assertAvailable: jest.fn(), fill: jest.fn().mockRejectedValue(new Error('no quote')) };
    const prisma = {
      position: {
        findUnique: jest.fn().mockResolvedValue(openPos()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      tradingAccount: { findUnique: jest.fn().mockResolvedValue(account) },
      order: { create: jest.fn() },
    } as any;
    const service = new TradingService(prisma, ledger as any, audit() as any, exec as any, marketWith() as any, mt5conn() as any);

    await expect(service.closePosition('u1', 'p1')).rejects.toThrow('no quote');
    expect(ledger.post).not.toHaveBeenCalled();
    expect(prisma.position.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' }, data: expect.objectContaining({ status: 'OPEN' }) }),
    );
  });
});

describe('TradingService.triggerPendingForQuote — atomic fill claim (H-5)', () => {
  const pendingOrder = () => ({
    id: 'o1', userId: 'u1', accountId: 'acc1', symbol: 'X', side: 'BUY',
    type: 'LIMIT', triggerPrice: new Prisma.Decimal(90), quantity: new Prisma.Decimal(1), status: 'PENDING',
  });
  const base = (claimCount: number) => {
    const prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([pendingOrder()]),
        updateMany: jest.fn().mockResolvedValue({ count: claimCount }),
      },
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
      position: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'p1' }) },
    } as any;
    return prisma;
  };

  it('opens a position only when it wins the PENDING→FILLED claim', async () => {
    const prisma = base(1);
    const service = new TradingService(prisma, ledgerWith(100000) as any, audit() as any, simExec(89) as any, marketWith() as any, mt5conn() as any);

    await service.triggerPendingForQuote('X', 89); // LIMIT BUY triggers at/below 90

    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'o1', status: 'PENDING' }), data: expect.objectContaining({ status: 'FILLED' }) }),
    );
    expect(prisma.position.create).toHaveBeenCalledTimes(1);
  });

  it('does not open a position when a concurrent tick already filled the order', async () => {
    const prisma = base(0); // lost the claim
    const service = new TradingService(prisma, ledgerWith(100000) as any, audit() as any, simExec(89) as any, marketWith() as any, mt5conn() as any);

    await service.triggerPendingForQuote('X', 89);

    expect(prisma.position.create).not.toHaveBeenCalled();
  });
});

describe('TradingService.processTick — auto-close atomic claim (H-5)', () => {
  const openTp = () => ({
    id: 'p1', userId: 'u1', accountId: 'acc1', symbol: 'X', side: 'BUY',
    quantity: new Prisma.Decimal(1), entryPrice: new Prisma.Decimal(100), status: 'OPEN',
    takeProfit: new Prisma.Decimal(110), stopLoss: null, realizedPnl: null,
  });
  const base = (claimCount: number) => {
    const prisma = {
      order: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'ord' }) },
      position: {
        findMany: jest.fn().mockImplementation(({ where }: any) => Promise.resolve(where.symbol ? [openTp()] : [])),
        updateMany: jest.fn().mockResolvedValue({ count: claimCount }),
        update: jest.fn().mockResolvedValue({}),
      },
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
    } as any;
    return prisma;
  };

  it('claims OPEN→CLOSED and posts P&L once when TP is hit', async () => {
    const prisma = base(1);
    const ledger = ledgerWith(0);
    const service = new TradingService(prisma, ledger as any, audit() as any, simExec(110) as any, marketWith() as any, mt5conn() as any);

    await service.processTick('X', 110);

    expect(prisma.position.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'p1', status: 'OPEN' }) }),
    );
    expect(ledger.post).toHaveBeenCalledTimes(1);
    expect(ledger.post.mock.calls[0][0].idempotencyKey).toBe('pnl:p1:close');
  });

  it('does not post P&L when a concurrent close already claimed the position', async () => {
    const prisma = base(0); // lost the claim
    const ledger = ledgerWith(0);
    const service = new TradingService(prisma, ledger as any, audit() as any, simExec(110) as any, marketWith() as any, mt5conn() as any);

    await service.processTick('X', 110);

    expect(ledger.post).not.toHaveBeenCalled();
  });
});

describe('TradingService.marginSnapshot', () => {
  it('computes equity, used margin, and margin level from live prices', async () => {
    const prisma = {
      position: { findMany: jest.fn().mockResolvedValue([{ symbol: 'X', side: 'BUY', quantity: new Prisma.Decimal(10), entryPrice: new Prisma.Decimal(100) }]) },
    } as any;
    const service = new TradingService(prisma, ledgerWith(30) as any, audit() as any, simExec(1) as any, marketWith([{ symbol: 'X', price: 95 }]) as any, mt5conn() as any);

    const snap = await service.marginSnapshot({ id: 'acc1', leverage: '1:100', ledgerAccount: { id: 'cl' } } as any);

    expect(snap.used).toBeCloseTo(10); // 100*10/100
    expect(snap.unrealized).toBeCloseTo(-50); // (95-100)*10
    expect(snap.equity).toBeCloseTo(-20); // 30 - 50
    expect(snap.marginLevel).toBeCloseTo(-200); // -20/10*100
  });
});

describe('TradingService.getMargin', () => {
  it('returns balance, equity, used, free margin and level', async () => {
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', leverage: '1:100', ledgerAccount: { id: 'cl' } }) },
      position: { findMany: jest.fn().mockResolvedValue([{ symbol: 'X', side: 'BUY', quantity: new Prisma.Decimal(10), entryPrice: new Prisma.Decimal(100) }]) },
    } as any;
    const service = new TradingService(prisma, ledgerWith(1000) as any, audit() as any, simExec(1) as any, marketWith([{ symbol: 'X', price: 101 }]) as any, mt5conn() as any);
    const m = await service.getMargin('u1', 'acc1');
    expect(m.used).toBeCloseTo(10); // 100*10/100
    expect(m.equity).toBeCloseTo(1010); // 1000 + (101-100)*10
    expect(m.free).toBeCloseTo(1000);
    expect(m.marginLevel).toBeCloseTo(10100);
  });
});

describe('TradingService.modifyOrder', () => {
  it('updates a pending order trigger price and quantity', async () => {
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({ id: 'po1', userId: 'u1', accountId: 'acc1', symbol: 'X', side: 'BUY', type: 'LIMIT', status: 'PENDING', triggerPrice: new Prisma.Decimal(90), quantity: new Prisma.Decimal(1) }),
        update: jest.fn().mockResolvedValue({ id: 'po1', triggerPrice: 80, quantity: 2 }),
      },
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
      position: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const service = new TradingService(prisma, ledgerWith(50000) as any, audit() as any, simExec(1) as any, marketWith() as any, mt5conn() as any);
    await service.modifyOrder('u1', 'po1', { triggerPrice: 80, quantity: 2 });
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'po1' }, data: { triggerPrice: 80, quantity: 2 } });
  });
});

describe('TradingService.resetDemo', () => {
  it('cancels pending, closes positions, and restores the balance', async () => {
    const post = jest.fn().mockResolvedValue({});
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', status: 'ACTIVE', mode: 'DEMO', leverage: '1:100', ledgerAccount: { id: 'cl' } }) },
      order: { updateMany: jest.fn().mockResolvedValue({}) },
      position: { updateMany: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const ledger = { balanceOf: jest.fn().mockResolvedValue(30000), getSystemAccount: jest.fn().mockResolvedValue({ id: 'df' }), post } as any;
    const service = new TradingService(prisma, ledger, audit() as any, simExec(1) as any, marketWith() as any, mt5conn() as any);
    await service.resetDemo('u1', 'acc1');
    expect(prisma.order.updateMany).toHaveBeenCalled();
    expect(prisma.position.updateMany).toHaveBeenCalled();
    const postings = post.mock.calls[0][0].postings; // delta 50000-30000=20000 â†’ add funds
    expect(postings.map((p: any) => [p.ledgerAccountId, p.direction])).toEqual([['df', 'DEBIT'], ['cl', 'CREDIT']]);
  });

  it('refuses non-demo accounts', async () => {
    const prisma = { tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', status: 'ACTIVE', mode: 'LIVE', ledgerAccount: { id: 'cl' } }) } } as any;
    const service = new TradingService(prisma, ledgerWith(0) as any, audit() as any, simExec(1) as any, marketWith() as any, mt5conn() as any);
    await expect(service.resetDemo('u1', 'acc1')).rejects.toThrow('Only demo accounts');
  });
});

describe('TradingService validation', () => {
  it('rejects a take-profit on the wrong side of entry', async () => {
    const prisma = { position: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', userId: 'u1', status: 'OPEN', side: 'BUY', entryPrice: new Prisma.Decimal(100) }) } } as any;
    const service = new TradingService(prisma, ledgerWith(0) as any, audit() as any, simExec(1) as any, marketWith() as any, mt5conn() as any);
    await expect(service.setProtection('u1', 'p1', { takeProfit: 90 } as any)).rejects.toThrow('Take-profit must be above');
  });

  it('rejects a limit buy placed above the market', async () => {
    const prisma = {
      tradingAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', status: 'ACTIVE', mode: 'DEMO', leverage: '1:500', ledgerAccount: { id: 'cl' } }) },
      position: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const service = new TradingService(prisma, ledgerWith(50000) as any, audit() as any, simExec(100) as any, marketWith([{ symbol: 'X', price: 100 }]) as any, mt5conn() as any);
    await expect(
      service.placeOrder('u1', { accountId: 'acc1', symbol: 'X', side: 'BUY', quantity: 1, type: 'LIMIT', triggerPrice: 110 } as any),
    ).rejects.toThrow('must trigger below');
  });
});
