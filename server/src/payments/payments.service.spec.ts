import { PaymentsService } from './payments.service';

// Constructor order: (prisma, ledger, audit)

describe('PaymentsService.handleStripeEvent', () => {
  const completedEvent = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        amount_total: 25000, // $250.00 in cents
        metadata: { userId: 'u1', tradingAccountId: 'acc1' },
      },
    },
  } as any;

  it('posts a real (simulated:false) deposit, idempotent on the session id', async () => {
    const post = jest.fn().mockResolvedValue({ id: 'j1' });
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      tradingAccount: {
        findUnique: jest.fn().mockResolvedValue({ id: 'acc1', userId: 'u1', ledgerAccount: { id: 'client-ledger' } }),
      },
    } as any;
    const ledger = { getSystemAccount: jest.fn().mockResolvedValue({ id: 'clearing' }), post } as any;
    const service = new PaymentsService(prisma, ledger, { record } as any, { create: jest.fn() } as any);

    const result = await service.handleStripeEvent(completedEvent);

    expect(result).toEqual({ handled: true });
    const arg = post.mock.calls[0][0];
    expect(arg.kind).toBe('DEPOSIT');
    expect(arg.simulated).toBe(false);
    expect(arg.idempotencyKey).toBe('stripe:cs_test_1');
    expect(arg.postings.map((p: any) => [p.ledgerAccountId, p.direction])).toEqual([
      ['clearing', 'DEBIT'],
      ['client-ledger', 'CREDIT'],
    ]);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'funds.deposit.stripe' }));
  });

  it('ignores non-deposit events', async () => {
    const service = new PaymentsService({} as any, {} as any, {} as any, { create: jest.fn() } as any);
    const result = await service.handleStripeEvent({ type: 'payment_intent.created', data: { object: {} } } as any);
    expect(result).toEqual({ handled: false });
  });

  it('rejects a completed session missing deposit metadata', async () => {
    const service = new PaymentsService({} as any, {} as any, {} as any, { create: jest.fn() } as any);
    const bad = { type: 'checkout.session.completed', data: { object: { id: 'cs', amount_total: 0, metadata: {} } } } as any;
    await expect(service.handleStripeEvent(bad)).rejects.toThrow(/metadata/);
  });
});
