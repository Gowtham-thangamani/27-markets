import { CardsService } from './cards.service';

describe('CardsService', () => {
  it('add stores only safe metadata and marks the first card default', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'c1', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030, isDefault: true });
    const prisma = { savedCard: { count: jest.fn().mockResolvedValue(0), create } } as any;
    const svc = new CardsService(prisma, { record: jest.fn() } as any, {} as any);

    const v = await svc.add('u1', { brand: 'Visa', last4: '4242', expMonth: 12, expYear: 2030 } as any);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ brand: 'visa', last4: '4242', isDefault: true }) }));
    expect(v).toEqual({ id: 'c1', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030, isDefault: true });
    // never expose raw card data
    expect(Object.keys(v)).not.toEqual(expect.arrayContaining(['number', 'cvv', 'pspPaymentMethodId']));
  });

  it("remove rejects another user's card", async () => {
    const prisma = { savedCard: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', userId: 'other' }) } } as any;
    const svc = new CardsService(prisma, {} as any, {} as any);
    await expect(svc.remove('u1', 'c1')).rejects.toThrow('Card not found');
  });

  it('deposit delegates to funds.deposit with a masked method label', async () => {
    const deposit = jest.fn().mockResolvedValue({ reference: 'TX-1', status: 'POSTED', simulated: true, amount: '100.00' });
    const prisma = { savedCard: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', userId: 'u1', last4: '4242' }) } } as any;
    const svc = new CardsService(prisma, { record: jest.fn() } as any, { deposit } as any);

    await svc.deposit('u1', 'c1', { accountId: 'acc1', amount: '100' } as any);

    expect(deposit).toHaveBeenCalledWith('u1', expect.objectContaining({ accountId: 'acc1', amount: '100', method: 'Card ••4242' }));
  });
});
