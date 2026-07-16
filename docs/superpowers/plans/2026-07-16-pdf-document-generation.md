# PDF Document Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff generate a real PDF (statement, receipt) for a client from an enabled `TextTemplate` of `kind = 'PDF'`, rendered on-the-fly and audited.

**Architecture:** A new `server/src/documents/` Nest module. Pure, dependency-free units (`tokens.ts`, `document-vars.ts`, `pdf-renderer.ts`) hold the error-prone logic and test without mocks; `documents.service.ts` orchestrates Prisma/Ledger/Audit/Config. The frontend gains a blob-capable API method and a generate modal inside the existing CRM client-detail modal.

**Tech Stack:** NestJS, Prisma, PDFKit, Jest (backend); React, Vite, Vitest, Tailwind (frontend).

**Spec:** `docs/superpowers/specs/2026-07-16-pdf-document-generation-design.md`

## Global Constraints

- Money never uses `number`. Use `Money` (`Prisma.Decimal`) and `formatMoney` from `server/src/ledger/money.ts`.
- Backend files use semicolons and 2-space indent; frontend files omit semicolons (match each side's existing style).
- All new admin routes are guarded: `@UseGuards(RolesGuard)` + `@Roles(...STAFF_ROLES)`, matching `server/src/admin/admin-partners.controller.ts`.
- `LedgerModule`, `AuditModule`, `PrismaModule`, and `ConfigModule` are all `@Global()` / `isGlobal` — do NOT add them to a module's `imports`.
- Auto-resolved variables always override admin-supplied ones. A client-supplied `balance` must never reach the PDF.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Backend tests: `npx jest <path>` from `server/`. Frontend tests: `npx vitest run <path>` from repo root.
- Do not flip `TRADING_MODE` to `LIVE`. The platform stays on the SIMULATION rail.

---

### Task 1: Shared `{{token}}` helper

The `{{\w+}}` regex is currently private inside `email.service.ts`. Lift it to a shared helper so document rendering and email rendering cannot drift.

**Files:**
- Create: `server/src/common/tokens.ts`
- Create: `server/src/common/tokens.spec.ts`
- Modify: `server/src/email/email.service.ts` (remove private `subst`, import helper)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `extractTokens(text: string): string[]` — distinct token names, first-seen order
  - `substituteTokens(text: string, vars: Record<string, string>): string`

- [ ] **Step 1: Write the failing test**

Create `server/src/common/tokens.spec.ts`:

```ts
import { extractTokens, substituteTokens } from './tokens';

describe('tokens', () => {
  it('extracts distinct token names in first-seen order', () => {
    expect(extractTokens('Hi {{clientName}}, balance {{balance}}, bye {{clientName}}')).toEqual([
      'clientName',
      'balance',
    ]);
  });

  it('returns an empty array when there are no tokens', () => {
    expect(extractTokens('no placeholders here')).toEqual([]);
  });

  it('substitutes known tokens', () => {
    expect(substituteTokens('Hi {{name}}', { name: 'Ada' })).toBe('Hi Ada');
  });

  it('renders unknown tokens as an empty string', () => {
    expect(substituteTokens('Hi {{name}} {{missing}}', { name: 'Ada' })).toBe('Hi Ada ');
  });

  it('is not confused by repeated calls (no shared regex state)', () => {
    const body = '{{a}} {{b}}';
    expect(extractTokens(body)).toEqual(['a', 'b']);
    expect(extractTokens(body)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest src/common/tokens.spec.ts`
Expected: FAIL — `Cannot find module './tokens'`

- [ ] **Step 3: Write minimal implementation**

Create `server/src/common/tokens.ts`:

```ts
/**
 * `{{token}}` placeholder handling, shared by email copy and PDF documents so
 * the two cannot drift apart.
 *
 * A fresh RegExp is built per call: a module-level /g regex carries `lastIndex`
 * between calls and would silently skip matches on every other invocation.
 */
const TOKEN_PATTERN = String.raw`\{\{(\w+)\}\}`;

/** Every distinct token name appearing in `text`, in first-seen order. */
export function extractTokens(text: string): string[] {
  const matches = Array.from(text.matchAll(new RegExp(TOKEN_PATTERN, 'g')), (m) => m[1]);
  return [...new Set(matches)];
}

/** Replace each `{{token}}` with `vars[token]`; unknown tokens render empty. */
export function substituteTokens(text: string, vars: Record<string, string>): string {
  return text.replace(new RegExp(TOKEN_PATTERN, 'g'), (_, key: string) => vars[key] ?? '');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest src/common/tokens.spec.ts`
Expected: PASS — 5 tests

- [ ] **Step 5: Refactor EmailService to use the helper**

In `server/src/email/email.service.ts`, add the import near the other imports:

```ts
import { substituteTokens } from '../common/tokens';
```

Delete the private `subst` method (currently around lines 81-83):

```ts
  private subst(text: string, vars: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');
  }
```

Then update the two call sites in `render` (currently around line 94) from:

```ts
    return { subject: this.subst(copy.subject, vars), text: this.subst(copy.body, vars) };
```

to:

```ts
    return { subject: substituteTokens(copy.subject, vars), text: substituteTokens(copy.body, vars) };
```

- [ ] **Step 6: Verify the email suite still passes**

Run: `cd server && npx jest src/email src/common/tokens.spec.ts`
Expected: PASS — no regression in the email tests.

- [ ] **Step 7: Commit**

```bash
git add server/src/common/tokens.ts server/src/common/tokens.spec.ts server/src/email/email.service.ts
git commit -m "$(cat <<'EOF'
refactor(common): shared {{token}} helper for email + documents

Lifts the {{\w+}} substitution regex out of EmailService so PDF document
rendering reuses it instead of duplicating it.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: PDF renderer

**Files:**
- Create: `server/src/documents/pdf-renderer.ts`
- Create: `server/src/documents/pdf-renderer.spec.ts`
- Modify: `server/package.json` (add `pdfkit`, `@types/pdfkit`)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `interface PdfDocumentInput { title: string; body: string; footerNote: string | null; generatedAt: Date }`
  - `renderPdf(input: PdfDocumentInput): Promise<Buffer>`
  - `simulationFooter(tradingMode: string | undefined): string | null`

- [ ] **Step 1: Install PDFKit**

Run: `cd server && npm install pdfkit && npm install -D @types/pdfkit`
Expected: both packages appear in `server/package.json`.

- [ ] **Step 2: Write the failing test**

Create `server/src/documents/pdf-renderer.spec.ts`:

```ts
import { renderPdf, simulationFooter } from './pdf-renderer';

describe('simulationFooter', () => {
  it('returns the watermark note when the platform is in SIMULATION', () => {
    expect(simulationFooter('SIMULATION')).toBe('SIMULATION — not a valid financial document');
  });

  it('returns null only when the platform is explicitly LIVE', () => {
    expect(simulationFooter('LIVE')).toBeNull();
  });

  it('fails safe: keeps the watermark for a missing or unknown mode', () => {
    expect(simulationFooter(undefined)).not.toBeNull();
    expect(simulationFooter('')).not.toBeNull();
    expect(simulationFooter('nonsense')).not.toBeNull();
  });
});

describe('renderPdf', () => {
  const input = {
    title: 'Account Statement',
    body: 'Statement for Ada Lovelace — period June 2026.\nBalance: 1250.00',
    footerNote: 'SIMULATION — not a valid financial document',
    generatedAt: new Date('2026-07-16T00:00:00.000Z'),
  };

  it('produces a valid PDF buffer', async () => {
    const buf = await renderPdf(input);
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(500);
  });

  it('omits the footer when footerNote is null', async () => {
    const withFooter = await renderPdf(input);
    const without = await renderPdf({ ...input, footerNote: null });
    expect(without.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    // Differential assertion: the only difference between these two renders is
    // the footer, so a shorter buffer is evidence it was actually omitted. A
    // bare '%PDF-' check would pass even if the footer were still drawn.
    expect(without.length).toBeLessThan(withFooter.length);
  });

  it('renders a body with no text without throwing', async () => {
    const buf = await renderPdf({ ...input, body: '' });
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
```

Note on test design: we assert the `%PDF-` magic bytes rather than searching the
buffer for the footer string. PDFKit compresses content streams and may split a
run of text across kerned `TJ` operators, so substring assertions on the binary
are brittle and would give false confidence. The footer *decision* is the part
with real logic, so it lives in `simulationFooter` and is tested directly.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd server && npx jest src/documents/pdf-renderer.spec.ts`
Expected: FAIL — `Cannot find module './pdf-renderer'`

- [ ] **Step 4: Write minimal implementation**

Create `server/src/documents/pdf-renderer.ts`:

```ts
import PDFDocument from 'pdfkit';

export interface PdfDocumentInput {
  title: string;
  body: string;
  /** Printed at the foot of the page; omitted entirely when null. */
  footerNote: string | null;
  generatedAt: Date;
}

const SIMULATION_NOTE = 'SIMULATION — not a valid financial document';

/**
 * The watermark line for a generated document, or null when the platform is
 * live. Anything other than an explicit 'LIVE' keeps the watermark, so a
 * missing or malformed TRADING_MODE fails safe rather than silently issuing a
 * document that looks real.
 */
export function simulationFooter(tradingMode: string | undefined): string | null {
  return tradingMode === 'LIVE' ? null : SIMULATION_NOTE;
}

/** Render a document to a PDF buffer. Pure: no Nest, Prisma, or I/O. */
export function renderPdf(input: PdfDocumentInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).fillColor('#111111').text('27 Markets');
    doc.moveDown(0.3);
    doc.fontSize(14).fillColor('#333333').text(input.title);
    doc.fontSize(9).fillColor('#777777').text(`Generated ${input.generatedAt.toISOString().slice(0, 10)}`);
    doc.moveDown(1.2);

    doc.fontSize(11).fillColor('#111111');
    if (input.body) doc.text(input.body, { align: 'left' });

    if (input.footerNote) {
      doc.moveDown(2);
      doc.fontSize(9).fillColor('#B00020').text(input.footerNote, { align: 'center' });
    }

    doc.end();
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx jest src/documents/pdf-renderer.spec.ts`
Expected: PASS — 6 tests

If TypeScript reports `esModuleInterop` trouble on the `import PDFDocument from 'pdfkit'` default import, use `import PDFDocument = require('pdfkit');` instead — do not add a `// @ts-ignore`.

- [ ] **Step 6: Commit**

```bash
git add server/src/documents/pdf-renderer.ts server/src/documents/pdf-renderer.spec.ts server/package.json server/package-lock.json
git commit -m "$(cat <<'EOF'
feat(documents): PDFKit renderer with fail-safe SIMULATION footer

Pure renderer: (title, body, footer) -> Buffer. simulationFooter keeps the
watermark unless TRADING_MODE is explicitly LIVE.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Document variable rules

**Files:**
- Create: `server/src/documents/document-vars.ts`
- Create: `server/src/documents/document-vars.spec.ts`

**Interfaces:**
- Consumes: `extractTokens` from `../common/tokens` (Task 1)
- Produces:
  - `CLIENT_TOKENS: readonly string[]` — `['clientName', 'clientEmail', 'date']`
  - `ACCOUNT_TOKENS: readonly string[]` — `['accountNumber', 'balance', 'currency']`
  - `AUTO_TOKENS: readonly string[]`
  - `needsAccount(body: string): boolean`
  - `manualTokens(body: string): string[]`
  - `slugify(name: string): string`

- [ ] **Step 1: Write the failing test**

Create `server/src/documents/document-vars.spec.ts`:

```ts
import { manualTokens, needsAccount, slugify } from './document-vars';

// The two bodies seeded by server/prisma/seed.ts.
const STATEMENT = 'Statement for {{clientName}} — period {{period}}.\nBalance: {{balance}}';
const RECEIPT = 'Receipt for deposit of {{amount}} by {{clientName}} on {{date}}.';

describe('needsAccount', () => {
  it('is true when the body uses an account-scoped token', () => {
    expect(needsAccount(STATEMENT)).toBe(true); // {{balance}}
  });

  it('is false when the body uses only client-scoped tokens', () => {
    expect(needsAccount(RECEIPT)).toBe(false);
  });

  it('is false for a body with no tokens at all', () => {
    expect(needsAccount('Plain text.')).toBe(false);
  });
});

describe('manualTokens', () => {
  it('returns only the tokens the server cannot resolve', () => {
    expect(manualTokens(STATEMENT)).toEqual(['period']);
    expect(manualTokens(RECEIPT)).toEqual(['amount']);
  });

  it('returns an empty array when every token is auto-resolved', () => {
    expect(manualTokens('Hi {{clientName}} on {{date}}')).toEqual([]);
  });
});

describe('slugify', () => {
  it('makes a filename-safe slug', () => {
    expect(slugify('Account Statement')).toBe('account-statement');
    expect(slugify('Deposit  Receipt!')).toBe('deposit-receipt');
  });

  it('never returns an empty slug', () => {
    expect(slugify('!!!')).toBe('document');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest src/documents/document-vars.spec.ts`
Expected: FAIL — `Cannot find module './document-vars'`

- [ ] **Step 3: Write minimal implementation**

Create `server/src/documents/document-vars.ts`:

```ts
import { extractTokens } from '../common/tokens';

/** Tokens resolvable from the client record alone. */
export const CLIENT_TOKENS = ['clientName', 'clientEmail', 'date'] as const;

/** Tokens that require a specific trading account to resolve. */
export const ACCOUNT_TOKENS = ['accountNumber', 'balance', 'currency'] as const;

/** Every token the server resolves itself; anything else is admin-supplied. */
export const AUTO_TOKENS: readonly string[] = [...CLIENT_TOKENS, ...ACCOUNT_TOKENS];

/** True when the body references a token that only an account can resolve. */
export function needsAccount(body: string): boolean {
  const accountTokens: readonly string[] = ACCOUNT_TOKENS;
  return extractTokens(body).some((t) => accountTokens.includes(t));
}

/** Tokens the admin must fill in, because the server cannot resolve them. */
export function manualTokens(body: string): string[] {
  return extractTokens(body).filter((t) => !AUTO_TOKENS.includes(t));
}

/** Filename-safe slug for a template name. Never empty. */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'document';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest src/documents/document-vars.spec.ts`
Expected: PASS — 8 tests

- [ ] **Step 5: Commit**

```bash
git add server/src/documents/document-vars.ts server/src/documents/document-vars.spec.ts
git commit -m "$(cat <<'EOF'
feat(documents): auto/manual token rules + account-scope detection

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Documents service, DTOs, controller, module

**Files:**
- Create: `server/src/documents/document-dto.ts`
- Create: `server/src/documents/documents.service.ts`
- Create: `server/src/documents/documents.service.spec.ts`
- Create: `server/src/documents/admin-documents.controller.ts`
- Create: `server/src/documents/documents.module.ts`
- Modify: `server/src/app.module.ts` (import `DocumentsModule`)

**Interfaces:**
- Consumes: `renderPdf`, `simulationFooter` (Task 2); `needsAccount`, `manualTokens`, `slugify` (Task 3); `substituteTokens` (Task 1)
- Produces:
  - `DocumentsService.prepare(templateId: string, clientId: string, accountId?: string): Promise<{ autoVars: Record<string,string>; manualTokens: string[]; needsAccount: boolean }>`
  - `DocumentsService.generate(adminId: string, dto: GenerateDocumentDto): Promise<{ buffer: Buffer; filename: string }>`

- [ ] **Step 1: Write the DTOs**

Create `server/src/documents/document-dto.ts`:

```ts
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class PrepareDocumentDto {
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsOptional()
  @IsString()
  accountId?: string;
}

export class GenerateDocumentDto {
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  /** Admin-supplied values for tokens the server cannot resolve. */
  @IsOptional()
  @IsObject()
  vars?: Record<string, string>;
}
```

- [ ] **Step 2: Write the failing test**

Create `server/src/documents/documents.service.spec.ts`:

```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd server && npx jest src/documents/documents.service.spec.ts`
Expected: FAIL — `Cannot find module './documents.service'`

- [ ] **Step 4: Write the service**

Create `server/src/documents/documents.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { formatMoney, toMoney } from '../ledger/money';
import { substituteTokens } from '../common/tokens';
import { manualTokens, needsAccount, slugify } from './document-vars';
import { renderPdf, simulationFooter } from './pdf-renderer';
import type { GenerateDocumentDto } from './document-dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  /** Tell the UI what it must ask the admin for before generating. */
  async prepare(templateId: string, clientId: string, accountId?: string) {
    const tpl = await this.loadTemplate(templateId);
    const needs = needsAccount(tpl.body);
    return {
      autoVars: await this.resolveAutoVars(clientId, needs ? accountId : undefined),
      manualTokens: manualTokens(tpl.body),
      needsAccount: needs,
    };
  }

  /** Render the template to a PDF buffer and record who issued it. */
  async generate(adminId: string, dto: GenerateDocumentDto) {
    const tpl = await this.loadTemplate(dto.templateId);
    const needs = needsAccount(tpl.body);
    if (needs && !dto.accountId) {
      throw new BadRequestException('Select a trading account for this template.');
    }

    const auto = await this.resolveAutoVars(dto.clientId, needs ? dto.accountId : undefined);
    // Auto values are spread last: an admin-supplied `balance` must never win
    // over the ledger's figure.
    const vars = { ...(dto.vars ?? {}), ...auto };

    const buffer = await renderPdf({
      title: tpl.name,
      body: substituteTokens(tpl.body, vars),
      footerNote: simulationFooter(this.config.get<string>('TRADING_MODE')),
      generatedAt: new Date(),
    });

    // Audited only after a successful render, so a failure leaves no phantom
    // "document issued" entry in the trail.
    await this.audit.record({
      userId: adminId,
      action: 'documents.generate',
      entity: 'TextTemplate',
      entityId: tpl.id,
      metadata: { clientId: dto.clientId, accountId: dto.accountId ?? null, template: tpl.name },
    });

    const date = new Date().toISOString().slice(0, 10);
    return { buffer, filename: `${slugify(tpl.name)}-${slugify(auto.clientName)}-${date}.pdf` };
  }

  private async loadTemplate(templateId: string) {
    const tpl = await this.prisma.textTemplate.findUnique({ where: { id: templateId } });
    if (!tpl) throw new NotFoundException('Template not found');
    if (tpl.kind !== 'PDF') throw new BadRequestException('Template is not a PDF template');
    if (!tpl.enabled) throw new BadRequestException('Template is disabled');
    return tpl;
  }

  private async resolveAutoVars(clientId: string, accountId?: string): Promise<Record<string, string>> {
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!client) throw new NotFoundException('Client not found');

    const vars: Record<string, string> = {
      clientName: `${client.firstName} ${client.lastName}`,
      clientEmail: client.email,
      date: new Date().toISOString().slice(0, 10),
    };

    if (accountId) {
      const account = await this.prisma.tradingAccount.findUnique({
        where: { id: accountId },
        select: { id: true, userId: true, number: true, currency: true, ledgerAccount: { select: { id: true } } },
      });
      // Ownership check: without it, staff could render another client's
      // balance onto this client's statement.
      if (!account || account.userId !== clientId) {
        throw new BadRequestException('Account does not belong to this client');
      }
      vars.accountNumber = account.number;
      vars.currency = account.currency;
      vars.balance = formatMoney(
        account.ledgerAccount ? await this.ledger.balanceOf(account.ledgerAccount.id) : toMoney(0),
      );
    }

    return vars;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx jest src/documents/documents.service.spec.ts`
Expected: PASS — 9 tests

- [ ] **Step 6: Write the controller**

Create `server/src/documents/admin-documents.controller.ts`:

```ts
import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { DocumentsService } from './documents.service';
import { GenerateDocumentDto, PrepareDocumentDto } from './document-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/documents')
export class AdminDocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('prepare')
  prepare(@Query() q: PrepareDocumentDto) {
    return this.documents.prepare(q.templateId, q.clientId, q.accountId);
  }

  @Post('generate')
  async generate(
    @CurrentUser('id') adminId: string,
    @Body() dto: GenerateDocumentDto,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.documents.generate(adminId, dto);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.end(buffer);
  }
}
```

- [ ] **Step 7: Write the module and register it**

Create `server/src/documents/documents.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AdminDocumentsController } from './admin-documents.controller';
import { DocumentsService } from './documents.service';

// Prisma, Ledger, Audit and Config are all global modules — no imports needed.
@Module({
  controllers: [AdminDocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
```

In `server/src/app.module.ts`, add the import at the top with the other module imports:

```ts
import { DocumentsModule } from './documents/documents.module';
```

and add `DocumentsModule,` to the `imports` array immediately after `AdminModule,` (around line 59).

- [ ] **Step 8: Verify the backend builds and the whole suite passes**

Run: `cd server && npm run build && npx jest`
Expected: build succeeds; all suites pass.

- [ ] **Step 9: Commit**

```bash
git add server/src/documents server/src/app.module.ts
git commit -m "$(cat <<'EOF'
feat(documents): admin PDF generation endpoints

GET /admin/documents/prepare and POST /admin/documents/generate, staff-guarded.
Auto-resolved vars always override admin input; account ownership is verified
before any balance is rendered; audit is written only after a successful render.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Frontend blob download support

The `api` client parses every response with `res.text()` + `JSON.parse`, which corrupts binary. Add a blob path that keeps the existing 401-refresh and timeout behaviour.

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/lib/adminApi.ts`

**Interfaces:**
- Consumes: `DocumentsService.prepare` / `.generate` HTTP shapes (Task 4)
- Produces:
  - `api.postBlob(path: string, body?: unknown): Promise<Blob>`
  - `interface DocumentPrepare { autoVars: Record<string, string>; manualTokens: string[]; needsAccount: boolean }`
  - `adminApi.prepareDocument(templateId, clientId, accountId?): Promise<DocumentPrepare>`
  - `adminApi.generateDocument(body): Promise<Blob>`

- [ ] **Step 1: Add the blob request path**

In `src/lib/api.ts`, add this function just above `export const api = {`:

```ts
/**
 * POST that returns binary (e.g. a generated PDF). Kept separate from
 * `request` because that path runs every response through res.text() +
 * JSON.parse, which corrupts binary payloads.
 */
async function requestBlob(path: string, body: unknown, _retried = false): Promise<Blob> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    })
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      throw new ApiError(408, 'The server took too long to respond. Please try again.')
    }
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  } finally {
    clearTimeout(timer)
  }

  if (res.ok) return await res.blob()

  if (res.status === 401 && !_retried && (await tryRefresh())) {
    return requestBlob(path, body, true)
  }

  // Errors are still JSON, so the normal parser applies.
  const parsed = await parseBody(res)
  const { message, code } = messageFrom(parsed, res.statusText || 'Request failed')
  throw new ApiError(res.status, message, code)
}
```

Then add `postBlob` to the exported `api` object:

```ts
  postBlob: (path: string, body?: unknown) => requestBlob(path, body),
```

- [ ] **Step 2: Add the adminApi types and methods**

In `src/lib/adminApi.ts`, add near the `TextTemplate` interface (around line 262):

```ts
export interface DocumentPrepare {
  autoVars: Record<string, string>
  manualTokens: string[]
  needsAccount: boolean
}
```

and add these two methods next to the existing text-template methods (around line 521):

```ts
  prepareDocument: (templateId: string, clientId: string, accountId?: string) =>
    api.get<DocumentPrepare>(
      `/admin/documents/prepare?templateId=${encodeURIComponent(templateId)}&clientId=${encodeURIComponent(clientId)}${accountId ? `&accountId=${encodeURIComponent(accountId)}` : ''}`,
    ),
  generateDocument: (body: { templateId: string; clientId: string; accountId?: string; vars: Record<string, string> }) =>
    api.postBlob('/admin/documents/generate', body),
```

- [ ] **Step 3: Verify the frontend builds**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api.ts src/lib/adminApi.ts
git commit -m "$(cat <<'EOF'
feat(api): blob POST path for binary downloads

The JSON request path runs every response through res.text()/JSON.parse, which
corrupts a PDF. postBlob keeps the 401-refresh and timeout behaviour.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Generate-document modal in the CRM

**Files:**
- Create: `src/components/admin/GenerateDocumentModal.tsx`
- Create: `src/components/admin/GenerateDocumentModal.spec.tsx`
- Modify: `src/pages/admin/AdminClientsPage.tsx` (button inside `ClientDetailModal`)

**Interfaces:**
- Consumes: `adminApi.listTextTemplates`, `adminApi.prepareDocument`, `adminApi.generateDocument` (Task 5); `ClientDetail` (existing — its `accounts` array already carries `{ id, number, type, mode, status, balance }`, so the modal needs no extra fetch for accounts)
- Produces: `<GenerateDocumentModal client={ClientDetail | null} onClose={() => void} />`

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/GenerateDocumentModal.spec.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GenerateDocumentModal } from './GenerateDocumentModal'
import { adminApi } from '@/lib/adminApi'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listTextTemplates: vi.fn(),
    prepareDocument: vi.fn(),
    generateDocument: vi.fn(),
  },
}))

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

const client = {
  id: 'c1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  accounts: [
    { id: 'a1', number: 'MT5-1001', type: 'STANDARD', mode: 'LIVE', status: 'ACTIVE', balance: '1250.00' },
  ],
} as any

const statement = { id: 't1', kind: 'PDF', name: 'Account Statement', body: '', enabled: true, sortOrder: 0, createdAt: '', updatedAt: '' }

describe('GenerateDocumentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // jsdom implements neither of these; download() calls both and would throw.
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    vi.mocked(adminApi.listTextTemplates).mockResolvedValue([statement] as any)
    vi.mocked(adminApi.prepareDocument).mockResolvedValue({
      autoVars: { clientName: 'Ada Lovelace', balance: '1250.00' },
      manualTokens: ['period'],
      needsAccount: true,
    })
  })

  it('lists the enabled PDF templates', async () => {
    render(<GenerateDocumentModal client={client} onClose={() => {}} />)
    await waitFor(() => expect(adminApi.listTextTemplates).toHaveBeenCalledWith('PDF'))
    expect(screen.getAllByText('Account Statement').length).toBeGreaterThan(0)
  })

  it('shows the account picker and an input per manual token', async () => {
    render(<GenerateDocumentModal client={client} onClose={() => {}} />)
    await userEvent.selectOptions(await screen.findByLabelText(/template/i), 't1')
    await waitFor(() => expect(adminApi.prepareDocument).toHaveBeenCalled())
    expect(await screen.findByLabelText(/trading account/i)).toBeInTheDocument()
    expect(await screen.findByLabelText(/period/i)).toBeInTheDocument()
  })

  it('generates with the chosen account and typed values', async () => {
    vi.mocked(adminApi.generateDocument).mockResolvedValue(new Blob(['x'], { type: 'application/pdf' }))
    render(<GenerateDocumentModal client={client} onClose={() => {}} />)
    await userEvent.selectOptions(await screen.findByLabelText(/template/i), 't1')
    await userEvent.type(await screen.findByLabelText(/period/i), 'June 2026')
    await userEvent.click(screen.getByRole('button', { name: /generate/i }))
    await waitFor(() =>
      expect(adminApi.generateDocument).toHaveBeenCalledWith({
        templateId: 't1',
        clientId: 'c1',
        accountId: 'a1',
        vars: { period: 'June 2026' },
      }),
    )
  })
})
```

Note: the DataTable `filter: 'select'` collision does not apply here (no DataTable),
but `getAllByText(...).length` is still used for the template name because it
appears in both the `<option>` and the heading.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/GenerateDocumentModal.spec.tsx`
Expected: FAIL — cannot resolve `./GenerateDocumentModal`

- [ ] **Step 3: Write the component**

Create `src/components/admin/GenerateDocumentModal.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Modal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type ClientDetail, type DocumentPrepare, type TextTemplate } from '@/lib/adminApi'

/** Trigger a browser download for a generated blob. */
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function GenerateDocumentModal({
  client,
  onClose,
}: {
  client: ClientDetail | null
  onClose: () => void
}) {
  const toast = useToast()
  const [templates, setTemplates] = useState<TextTemplate[]>([])
  const [templateId, setTemplateId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [prep, setPrep] = useState<DocumentPrepare | null>(null)
  const [vars, setVars] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!client) return
    adminApi
      .listTextTemplates('PDF')
      .then((all) => setTemplates(all.filter((t) => t.enabled)))
      .catch(() => setTemplates([]))
  }, [client])

  // Default to the client's first account so the common case needs no picking.
  useEffect(() => {
    if (client && client.accounts.length > 0) setAccountId(client.accounts[0].id)
  }, [client])

  const load = useCallback(
    async (id: string, acct: string) => {
      if (!client || !id) return
      try {
        setPrep(await adminApi.prepareDocument(id, client.id, acct || undefined))
      } catch (e) {
        toast.error('Could not prepare document', e instanceof ApiError ? e.message : (e as Error).message)
      }
    },
    [client, toast],
  )

  useEffect(() => {
    setVars({})
    void load(templateId, accountId)
  }, [templateId, accountId, load])

  const generate = async () => {
    if (!client || !templateId) return
    setBusy(true)
    try {
      const blob = await adminApi.generateDocument({
        templateId,
        clientId: client.id,
        ...(prep?.needsAccount ? { accountId } : {}),
        vars,
      })
      const name = templates.find((t) => t.id === templateId)?.name ?? 'document'
      download(blob, `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
      toast.success('Document generated')
      onClose()
    } catch (e) {
      toast.error('Could not generate', e instanceof ApiError ? e.message : (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!client) return null
  const selected = templates.find((t) => t.id === templateId)

  return (
    <Modal open={!!client} onClose={onClose} title="Generate document" description={client.name} className="max-w-lg">
      <div className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-gray-400">Template</span>
          <select
            aria-label="Template"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-ink-800 px-3 py-2 text-white"
          >
            <option value="">Select a template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        {selected && <h4 className="text-sm font-semibold text-white">{selected.name}</h4>}

        {prep?.needsAccount && (
          <label className="block text-sm">
            <span className="mb-1 block text-gray-400">Trading account</span>
            <select
              aria-label="Trading account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-ink-800 px-3 py-2 text-white"
            >
              {client.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.number} · {a.type}
                </option>
              ))}
            </select>
          </label>
        )}

        {prep?.manualTokens.map((token) => (
          <Input
            key={token}
            label={token}
            aria-label={token}
            value={vars[token] ?? ''}
            onChange={(e) => setVars((v) => ({ ...v, [token]: e.target.value }))}
          />
        ))}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={generate} loading={busy} disabled={!templateId}>
            Generate PDF
          </Button>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/GenerateDocumentModal.spec.tsx`
Expected: PASS — 3 tests

If the `Input` component does not forward `aria-label`, use its `label` prop as the
accessible name and query with `getByLabelText(/period/i)` — do not weaken the
assertion to `getByPlaceholderText`.

- [ ] **Step 5: Wire the button into the client detail modal**

In `src/pages/admin/AdminClientsPage.tsx`, add the import:

```tsx
import { GenerateDocumentModal } from '@/components/admin/GenerateDocumentModal'
```

Inside `ClientDetailModal`, add state near `const [note, setNote] = useState('')`:

```tsx
  const [genOpen, setGenOpen] = useState(false)
```

Add the trigger button just above the `<h4>Accounts</h4>` block's parent `<div>`:

```tsx
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => setGenOpen(true)}>
              Generate document
            </Button>
          </div>
```

And render the modal at the end of the `client && (...)` block, after the notes section:

```tsx
          <GenerateDocumentModal client={genOpen ? client : null} onClose={() => setGenOpen(false)} />
```

- [ ] **Step 6: Verify the full frontend build and suite**

Run: `npm run build && npx vitest run`
Expected: build succeeds; all suites pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/GenerateDocumentModal.tsx src/components/admin/GenerateDocumentModal.spec.tsx src/pages/admin/AdminClientsPage.tsx
git commit -m "$(cat <<'EOF'
feat(admin): generate a PDF document for a client from a PDF template

Adds a generate modal to the CRM client detail: pick an enabled PDF template,
choose the trading account when the template needs one, fill any tokens the
server cannot resolve, and download the rendered PDF.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full backend build + suite**

Run: `cd server && npm run build && npx jest`
Expected: all green.

- [ ] **Step 2: Full frontend build + suite**

Run: `npm run build && npx vitest run`
Expected: all green.

- [ ] **Step 3: Drive the real flow**

Start the stack (`npm run dev:all`), sign in as an admin, open **Clients → a client
with a trading account → Generate document → Account Statement**, fill `period`,
and click **Generate PDF**.

Confirm, by opening the downloaded file:
- The PDF opens and shows the client name and the account's real balance.
- No `{{token}}` remains unreplaced in the output.
- The footer reads `SIMULATION — not a valid financial document`.

- [ ] **Step 4: Confirm the audit entry**

The generate call must have written one `documents.generate` audit row. Verify:

```bash
cd server && npx prisma studio
```

Open `AuditLog`, confirm a `documents.generate` row exists with the admin's
`userId` and the client in `metadata`.

- [ ] **Step 5: Push**

```bash
git push origin main
```

---

## Notes for the implementer

- **Deviation from the spec, deliberate:** the spec's `prepare` response included
  an `accounts` array. It is omitted here — `ClientDetail.accounts` already
  carries `{ id, number, type, mode, status, balance }`, so returning accounts
  again would be redundant data with two sources of truth. The account picker is
  built from `client.accounts`.
- **Do not** trust `dto.vars` for any auto-resolved token. The spread order in
  `generate` (`{ ...dto.vars, ...auto }`) is the control that prevents it; keep it.
- The Mac teammate will need `npm install` in `server/` after Task 2 (new `pdfkit`
  dependency).
