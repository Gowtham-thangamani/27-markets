import { NotFoundException } from '@nestjs/common';
import { InstrumentsService } from './instruments.service';

function makePrisma(rows: any[] = []) {
  const store = [...rows];
  return {
    _store: store,
    tradingInstrument: {
      findMany: jest.fn(({ where }: any = {}) => {
        let out = store;
        if (where?.enabled !== undefined) out = out.filter((r) => r.enabled === where.enabled);
        return Promise.resolve([...out]);
      }),
      findUnique: jest.fn(({ where }: any) =>
        Promise.resolve(store.find((r) => r.id === where.id) ?? null),
      ),
      create: jest.fn(({ data }: any) => {
        const row = { id: `ti_${store.length + 1}`, ...data };
        store.push(row);
        return Promise.resolve(row);
      }),
      update: jest.fn(({ where, data }: any) => {
        const row = store.find((r) => r.id === where.id);
        Object.assign(row, data);
        return Promise.resolve(row);
      }),
      delete: jest.fn(({ where }: any) => {
        const i = store.findIndex((r) => r.id === where.id);
        const [row] = store.splice(i, 1);
        return Promise.resolve(row);
      }),
    },
  };
}

const audit = { record: jest.fn() } as any;

describe('InstrumentsService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listPublic returns only enabled instruments', async () => {
    const prisma = makePrisma([
      { id: 'a', symbol: 'EUR/USD', enabled: true, feed: 'OANDA:EUR_USD', spread: 0.1 },
      { id: 'b', symbol: 'US500', enabled: false, feed: null, spread: 0.4 },
    ]);
    const svc = new InstrumentsService(prisma as any, audit);
    const rows = await svc.listPublic();
    expect(rows.map((r) => r.symbol)).toEqual(['EUR/USD']);
  });

  it('create applies defaults, keeps null feed, and audits', async () => {
    const prisma = makePrisma();
    const svc = new InstrumentsService(prisma as any, audit);
    const row = await svc.create('admin1', {
      symbol: 'US500',
      name: 'S&P 500',
      category: 'Indices',
    } as any);
    expect(row.feed).toBeNull();
    expect(row.spread).toBe(0);
    expect(row.enabled).toBe(true);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'instrument.create' }),
    );
  });

  it('update clears the feed when passed an empty string', async () => {
    const prisma = makePrisma([
      { id: 'a', symbol: 'AAPL', enabled: true, feed: 'AAPL', spread: 0.05 },
    ]);
    const svc = new InstrumentsService(prisma as any, audit);
    const row = await svc.update('admin1', 'a', { feed: '' } as any);
    expect(row.feed).toBeNull();
  });

  it('update throws NotFound for a missing id', async () => {
    const prisma = makePrisma();
    const svc = new InstrumentsService(prisma as any, audit);
    await expect(svc.update('admin1', 'nope', { name: 'x' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('remove deletes and audits', async () => {
    const prisma = makePrisma([{ id: 'a', symbol: 'BTC/USD', enabled: true, feed: 'x', spread: 1 }]);
    const svc = new InstrumentsService(prisma as any, audit);
    expect(await svc.remove('admin1', 'a')).toEqual({ id: 'a' });
    expect(prisma._store).toHaveLength(0);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'instrument.delete' }),
    );
  });
});
