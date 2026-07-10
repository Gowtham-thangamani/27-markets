import { NotFoundException } from '@nestjs/common';
import { DownloadsService } from './downloads.service';

// Minimal in-memory stand-ins for Prisma + Audit.
function makePrisma(rows: any[] = []) {
  const store = [...rows];
  return {
    _store: store,
    downloadItem: {
      findMany: jest.fn(({ where, orderBy }: any = {}) => {
        let out = store;
        if (where?.enabled !== undefined) out = out.filter((r) => r.enabled === where.enabled);
        return Promise.resolve([...out]);
      }),
      findUnique: jest.fn(({ where }: any) =>
        Promise.resolve(store.find((r) => r.id === where.id) ?? null),
      ),
      create: jest.fn(({ data }: any) => {
        const row = { id: `dl_${store.length + 1}`, ...data };
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

describe('DownloadsService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listPublic returns only enabled items', async () => {
    const prisma = makePrisma([
      { id: 'a', name: 'A', enabled: true, sortOrder: 0, url: null },
      { id: 'b', name: 'B', enabled: false, sortOrder: 1, url: null },
    ]);
    const svc = new DownloadsService(prisma as any, audit);
    const rows = await svc.listPublic();
    expect(rows.map((r) => r.id)).toEqual(['a']);
  });

  it('listAll returns every item', async () => {
    const prisma = makePrisma([
      { id: 'a', name: 'A', enabled: true, sortOrder: 0, url: null },
      { id: 'b', name: 'B', enabled: false, sortOrder: 1, url: null },
    ]);
    const svc = new DownloadsService(prisma as any, audit);
    const rows = await svc.listAll();
    expect(rows).toHaveLength(2);
  });

  it('create applies defaults and audits', async () => {
    const prisma = makePrisma();
    const svc = new DownloadsService(prisma as any, audit);
    const row = await svc.create('admin1', {
      name: 'MT5',
      platform: 'Windows',
      description: 'desc',
    } as any);
    expect(row.icon).toBe('desktop');
    expect(row.size).toBe('—');
    expect(row.enabled).toBe(true);
    expect(row.url).toBeNull();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'download.create', userId: 'admin1' }),
    );
  });

  it('update clears the url when passed an empty string', async () => {
    const prisma = makePrisma([
      { id: 'a', name: 'A', enabled: true, sortOrder: 0, url: 'https://x.test/f.exe' },
    ]);
    const svc = new DownloadsService(prisma as any, audit);
    const row = await svc.update('admin1', 'a', { url: '' } as any);
    expect(row.url).toBeNull();
  });

  it('update throws NotFound for a missing id', async () => {
    const prisma = makePrisma();
    const svc = new DownloadsService(prisma as any, audit);
    await expect(svc.update('admin1', 'nope', { name: 'x' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('remove deletes and audits', async () => {
    const prisma = makePrisma([
      { id: 'a', name: 'A', enabled: true, sortOrder: 0, url: null },
    ]);
    const svc = new DownloadsService(prisma as any, audit);
    const res = await svc.remove('admin1', 'a');
    expect(res).toEqual({ id: 'a' });
    expect(prisma._store).toHaveLength(0);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'download.delete' }),
    );
  });
});
