import { NotFoundException } from '@nestjs/common';
import { EconomicCalendarService } from './economic-calendar.service';

function makePrisma(rows: any[] = []) {
  const store = [...rows];
  return {
    _store: store,
    economicEvent: {
      findMany: jest.fn(({ where }: any = {}) => {
        let out = store;
        if (where?.enabled !== undefined) out = out.filter((r) => r.enabled === where.enabled);
        if (where?.eventAt?.gte) out = out.filter((r) => r.eventAt >= where.eventAt.gte);
        if (where?.eventAt?.lte) out = out.filter((r) => r.eventAt <= where.eventAt.lte);
        return Promise.resolve([...out]);
      }),
      findUnique: jest.fn(({ where }: any) =>
        Promise.resolve(store.find((r) => r.id === where.id) ?? null),
      ),
      create: jest.fn(({ data }: any) => {
        const row = { id: `ec_${store.length + 1}`, ...data };
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

// Fixed clock via injected rows around "now".
const past = new Date('2020-01-01T00:00:00Z');
const future = new Date('2999-01-01T00:00:00Z');

describe('EconomicCalendarService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listPublic returns only enabled, future events', async () => {
    const prisma = makePrisma([
      { id: 'a', title: 'A', enabled: true, eventAt: future },
      { id: 'b', title: 'B', enabled: false, eventAt: future },
      { id: 'c', title: 'C', enabled: true, eventAt: past },
    ]);
    const svc = new EconomicCalendarService(prisma as any, audit);
    const rows = await svc.listPublic();
    expect(rows.map((r) => r.id)).toEqual(['a']);
  });

  it('listAll returns every event', async () => {
    const prisma = makePrisma([
      { id: 'a', title: 'A', enabled: true, eventAt: future },
      { id: 'b', title: 'B', enabled: false, eventAt: past },
    ]);
    const svc = new EconomicCalendarService(prisma as any, audit);
    expect(await svc.listAll()).toHaveLength(2);
  });

  it('create applies defaults, serialises eventAt, and audits', async () => {
    const prisma = makePrisma();
    const svc = new EconomicCalendarService(prisma as any, audit);
    const row = await svc.create('admin1', {
      title: 'NFP',
      country: 'US',
      currency: 'USD',
      eventAt: '2999-06-01T13:00:00.000Z',
    } as any);
    expect(row.impact).toBe('MEDIUM');
    expect(row.enabled).toBe(true);
    expect(row.forecast).toBeNull();
    expect(row.eventAt).toBe('2999-06-01T13:00:00.000Z');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'economic_event.create' }),
    );
  });

  it('update clears an optional value when passed an empty string', async () => {
    const prisma = makePrisma([
      { id: 'a', title: 'A', enabled: true, eventAt: future, forecast: '3.1%' },
    ]);
    const svc = new EconomicCalendarService(prisma as any, audit);
    const row = await svc.update('admin1', 'a', { forecast: '' } as any);
    expect(row.forecast).toBeNull();
  });

  it('update throws NotFound for a missing id', async () => {
    const prisma = makePrisma();
    const svc = new EconomicCalendarService(prisma as any, audit);
    await expect(svc.update('admin1', 'nope', { title: 'x' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('remove deletes and audits', async () => {
    const prisma = makePrisma([{ id: 'a', title: 'A', enabled: true, eventAt: future }]);
    const svc = new EconomicCalendarService(prisma as any, audit);
    expect(await svc.remove('admin1', 'a')).toEqual({ id: 'a' });
    expect(prisma._store).toHaveLength(0);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'economic_event.delete' }),
    );
  });
});
