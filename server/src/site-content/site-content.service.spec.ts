import { NotFoundException } from '@nestjs/common';
import { SiteContentService } from './site-content.service';

function makeStore(rows: any[] = []) {
  const store = [...rows];
  return {
    store,
    api: {
      findMany: jest.fn(({ where }: any = {}) => {
        let out = store;
        if (where?.enabled !== undefined) out = out.filter((r) => r.enabled === where.enabled);
        return Promise.resolve([...out]);
      }),
      findUnique: jest.fn(({ where }: any) =>
        Promise.resolve(store.find((r) => r.id === where.id) ?? null),
      ),
      create: jest.fn(({ data }: any) => {
        const row = { id: `id_${store.length + 1}`, ...data };
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

describe('SiteContentService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listPublicTestimonials returns only enabled', async () => {
    const t = makeStore([
      { id: 'a', name: 'A', initials: 'A', quote: 'x', enabled: true },
      { id: 'b', name: 'B', initials: 'B', quote: 'y', enabled: false },
    ]);
    const prisma = { testimonial: t.api, dfmSymbol: makeStore().api } as any;
    const svc = new SiteContentService(prisma, audit);
    expect((await svc.listPublicTestimonials()).map((r) => r.id)).toEqual(['a']);
  });

  it('createTestimonial applies defaults and audits', async () => {
    const t = makeStore();
    const prisma = { testimonial: t.api, dfmSymbol: makeStore().api } as any;
    const svc = new SiteContentService(prisma, audit);
    const row = await svc.createTestimonial('admin1', {
      name: 'Ahmed R.',
      initials: 'AR',
      quote: 'Great',
    } as any);
    expect(row.enabled).toBe(true);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'testimonial.create' }),
    );
  });

  it('updateTestimonial throws NotFound for a missing id', async () => {
    const prisma = { testimonial: makeStore().api, dfmSymbol: makeStore().api } as any;
    const svc = new SiteContentService(prisma, audit);
    await expect(svc.updateTestimonial('a', 'nope', { name: 'x' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('listPublicDfm returns only enabled and createDfm audits', async () => {
    const d = makeStore([
      { id: 'a', symbol: 'EMAAR', name: 'Emaar', enabled: true },
      { id: 'b', symbol: 'DEWA', name: 'Dewa', enabled: false },
    ]);
    const prisma = { testimonial: makeStore().api, dfmSymbol: d.api } as any;
    const svc = new SiteContentService(prisma, audit);
    expect((await svc.listPublicDfm()).map((r) => r.symbol)).toEqual(['EMAAR']);
    await svc.createDfm('admin1', { symbol: 'SALIK', name: 'Salik' } as any);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'dfm_symbol.create' }),
    );
  });

  it('removeDfm deletes', async () => {
    const d = makeStore([{ id: 'a', symbol: 'DIB', name: 'DIB', enabled: true }]);
    const prisma = { testimonial: makeStore().api, dfmSymbol: d.api } as any;
    const svc = new SiteContentService(prisma, audit);
    expect(await svc.removeDfm('admin1', 'a')).toEqual({ id: 'a' });
    expect(d.store).toHaveLength(0);
  });
});
