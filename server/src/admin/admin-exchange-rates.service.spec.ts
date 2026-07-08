import { AdminExchangeRatesService } from './admin-exchange-rates.service';

// Constructor order: (prisma, audit).
describe('AdminExchangeRatesService', () => {
  it('lists rates as strings, ordered by base then quote', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'r1', base: 'USD', quote: 'EUR', rate: { toString: () => '0.92' } }]);
    const service = new AdminExchangeRatesService({ exchangeRate: { findMany } } as any, {} as any);

    const rows = await service.list();

    expect(findMany).toHaveBeenCalledWith({ orderBy: [{ base: 'asc' }, { quote: 'asc' }] });
    expect(rows[0].rate).toBe('0.92');
  });

  it('rejects a same base/quote pair', async () => {
    const service = new AdminExchangeRatesService({} as any, {} as any);
    await expect(service.create('admin1', { base: 'USD', quote: 'usd', rate: '1' })).rejects.toThrow('Base and quote must differ');
  });

  it('remove throws NotFound for an unknown rate', async () => {
    const prisma = { exchangeRate: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new AdminExchangeRatesService(prisma, {} as any);
    await expect(service.remove('admin1', 'nope')).rejects.toThrow('Exchange rate not found');
  });
});
