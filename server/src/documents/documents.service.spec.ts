import { DocumentsService } from './documents.service';
import * as renderer from './pdf-renderer';

const STATEMENT = 'Statement for {{clientName}} — period {{period}}.\nBalance: {{balance}}';
const RECEIPT = 'Receipt for deposit of {{amount}} by {{clientName}} on {{date}}.';

const template = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 't1',
  kind: 'PDF',
  name: 'Account Statement',
  body: STATEMENT,
  enabled: true,
  ...over,
});

const client = { id: 'c1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' };

const account = {
  id: 'a1',
  userId: 'c1',
  number: 'MT5-1001',
  currency: 'USD',
  ledgerAccount: { id: 'la1' },
};

function build(over: { template?: unknown; account?: unknown } = {}) {
  const prisma = {
    textTemplate: { findUnique: jest.fn().mockResolvedValue(over.template ?? template()) },
    user: { findUnique: jest.fn().mockResolvedValue(client) },
    tradingAccount: { findUnique: jest.fn().mockResolvedValue(over.account ?? account) },
  } as any;
  const ledger = { balanceOf: jest.fn().mockResolvedValue({ toFixed: () => '1250.00' }) } as any;
  const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
  const config = { get: jest.fn().mockReturnValue('SIMULATION') } as any;
  return { prisma, ledger, audit, config, service: new DocumentsService(prisma, ledger, audit, config) };
}

describe('DocumentsService.prepare', () => {
  it('reports the account requirement and the tokens the admin must fill', async () => {
    const { service } = build();
    const r = await service.prepare('t1', 'c1', 'a1');
    expect(r.needsAccount).toBe(true);
    expect(r.manualTokens).toEqual(['period']);
    expect(r.autoVars).toEqual(expect.objectContaining({ clientName: 'Ada Lovelace', balance: '1250.00' }));
  });

  it('omits account vars when the template does not need an account', async () => {
    const { service } = build({ template: template({ body: RECEIPT, name: 'Deposit Receipt' }) });
    const r = await service.prepare('t1', 'c1');
    expect(r.needsAccount).toBe(false);
    expect(r.autoVars.balance).toBeUndefined();
  });
});

describe('DocumentsService.generate', () => {
  it('renders a PDF and audits the issue', async () => {
    const { service, audit } = build();
    const r = await service.generate('admin1', {
      templateId: 't1',
      clientId: 'c1',
      accountId: 'a1',
      vars: { period: 'June 2026' },
    });
    expect(r.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(r.filename).toMatch(/^account-statement-.*\.pdf$/);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'admin1', action: 'documents.generate', entityId: 't1' }),
    );
  });

  it('ignores an admin-supplied balance so it cannot override the ledger', async () => {
    const { service } = build();
    // Spy on the renderer to assert what actually reaches the PDF. NestJS
    // compiles to CommonJS, so the named import is a property lookup on the
    // module object and this spy does intercept it.
    const spy = jest.spyOn(renderer, 'renderPdf');
    await service.generate('admin1', {
      templateId: 't1',
      clientId: 'c1',
      accountId: 'a1',
      vars: { period: 'June 2026', balance: '999999.00' },
    });
    const body = spy.mock.calls[0][0].body;
    expect(body).toContain('1250.00');
    expect(body).not.toContain('999999');
    spy.mockRestore();
  });

  it('rejects an account belonging to another client', async () => {
    const { service } = build({ account: { ...account, userId: 'someone-else' } });
    await expect(
      service.generate('admin1', { templateId: 't1', clientId: 'c1', accountId: 'a1', vars: {} }),
    ).rejects.toThrow(/does not belong/i);
  });

  it('rejects a disabled template', async () => {
    const { service } = build({ template: template({ enabled: false }) });
    await expect(
      service.generate('admin1', { templateId: 't1', clientId: 'c1', accountId: 'a1', vars: {} }),
    ).rejects.toThrow(/disabled/i);
  });

  it('rejects a non-PDF template', async () => {
    const { service } = build({ template: template({ kind: 'COMMENT' }) });
    await expect(
      service.generate('admin1', { templateId: 't1', clientId: 'c1', accountId: 'a1', vars: {} }),
    ).rejects.toThrow(/not a PDF/i);
  });

  it('requires an account when the template uses account-scoped tokens', async () => {
    const { service } = build();
    await expect(
      service.generate('admin1', { templateId: 't1', clientId: 'c1', vars: {} }),
    ).rejects.toThrow(/select a trading account/i);
  });

  it('does not audit when generation fails before the render completes', async () => {
    const { service, audit, ledger } = build();
    ledger.balanceOf.mockRejectedValue(new Error('ledger down'));
    await expect(
      service.generate('admin1', { templateId: 't1', clientId: 'c1', accountId: 'a1', vars: {} }),
    ).rejects.toThrow();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
