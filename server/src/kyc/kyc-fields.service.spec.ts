import { KycService } from './kyc.service';

// Constructor order: (prisma, audit, storage).
describe('KycService — fields & answers', () => {
  it('listFields returns only enabled question/extended fields', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new KycService({ kycFieldDefinition: { findMany } } as any, {} as any, {} as any);

    await service.listFields();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { enabled: true, kind: { in: ['QUESTION', 'EXTENDED'] } } }));
  });

  it('getAnswers maps rows to a fieldId->value object', async () => {
    const findMany = jest.fn().mockResolvedValue([{ fieldId: 'f1', value: 'Yes' }, { fieldId: 'f2', value: 'Trader' }]);
    const service = new KycService({ kycAnswer: { findMany } } as any, {} as any, {} as any);

    const answers = await service.getAnswers('u1');

    expect(answers).toEqual({ f1: 'Yes', f2: 'Trader' });
  });

  it('saveAnswers upserts each answer and audits the batch', async () => {
    const upsert = jest.fn().mockReturnValue('op');
    const $transaction = jest.fn().mockResolvedValue([]);
    const record = jest.fn().mockResolvedValue(undefined);
    const prisma = { kycAnswer: { upsert, findMany: jest.fn().mockResolvedValue([]) }, $transaction } as any;
    const service = new KycService(prisma, { record } as any, {} as any);

    await service.saveAnswers('u1', [{ fieldId: 'f1', value: 'Yes' }]);

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId_fieldId: { userId: 'u1', fieldId: 'f1' } } }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'kyc.answers.save' }));
  });
});
