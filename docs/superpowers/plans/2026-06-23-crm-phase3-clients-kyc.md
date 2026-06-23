# CRM Phase 3 — Clients + KYC: Complete & Harden Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish and harden the already-built Clients-360 and KYC-review slice: add a real server-side KYC pending queue, make staff review the actual documents before deciding, and put the CRM code under test.

**Architecture:** The Clients/KYC backend (`AdminCrmService`, `KycService`) and frontend (`AdminClientsPage`, `AdminKycPage`, `adminApi`) already exist and typecheck. This plan does NOT rebuild them — it closes specific gaps and adds tests. Backend: NestJS 10 + Prisma + Jest. Frontend: React + Vitest + RTL.

**Tech Stack:** NestJS 10, Prisma 5, Jest (backend); React 18, Vite, Vitest + @testing-library/react (frontend). All harnesses already installed.

## Global Constraints

- Build ON the committed code; do not rewrite working endpoints/pages. Match existing conventions (class-validator DTOs, `@Roles(...STAFF_ROLES)` controllers, `adminApi` typed wrappers, `PageTitle`/`glass-panel` UI).
- Staff = ADMIN + AGENT. KYC **review (approve/reject) stays ADMIN-only** (existing `POST /kyc/review`); listing/viewing the queue + documents is staff (ADMIN+AGENT).
- Every state-changing action writes to `AuditLog` (already true for client notes + KYC review — keep it).
- No money movement; SIMULATION rail untouched.
- Keep green: backend `npm run typecheck` + `npm test`; frontend `npx tsc -b` + `npm test`.
- Start from a clean tree (the WIP is now committed). Each task ends with its own commit.

## Existing code this plan touches (read before editing)
- `server/src/admin/admin-crm.service.ts` — `listClients`, `getClient`, `addClientNote`, `listStaff`.
- `server/src/admin/admin-crm.controller.ts` — `@Controller('admin')`, staff-guarded.
- `server/src/kyc/kyc.service.ts` — `review`, `documentsFor`, `readDocument`, `status`.
- `server/src/kyc/kyc.controller.ts` — `GET /kyc/documents/:userId`, `GET /kyc/document/:id`, `POST /kyc/review`.
- `src/lib/adminApi.ts` — typed admin client.
- `src/pages/admin/AdminKycPage.tsx` — currently sources the queue via `listClients()` + client-side filter; has no document viewer.
- `src/pages/admin/AdminClientsPage.tsx` — clients list + 360 drawer + add-note.

---

### Task 1: Backend — server-side KYC pending queue

**Files:**
- Modify: `server/src/admin/admin-crm.service.ts` (add `kycQueue()`)
- Modify: `server/src/admin/admin-crm.controller.ts` (add `GET /admin/kyc/queue`)
- Create: `server/src/admin/admin-crm.service.spec.ts`

**Interfaces:**
- Produces: `GET /api/admin/kyc/queue` (staff) → array of
  `{ id, email, firstName, lastName, country, kycProfile: { identityStatus, addressStatus, selfieStatus } }`
  for CLIENT users with **at least one step PENDING**, newest first.

- [ ] **Step 1: Write the failing service test**

Create `server/src/admin/admin-crm.service.spec.ts`:
```ts
import { AdminCrmService } from './admin-crm.service';

describe('AdminCrmService.kycQueue', () => {
  it('queries CLIENT users having any PENDING KYC step, newest first', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'c1' }]);
    const prisma = { user: { findMany } } as any;
    const service = new AdminCrmService(prisma, {} as any, {} as any);

    const result = await service.kycQueue();

    expect(result).toEqual([{ id: 'c1' }]);
    const arg = findMany.mock.calls[0][0];
    expect(arg.where.role).toBe('CLIENT');
    expect(arg.where.kycProfile.is.OR).toEqual([
      { identityStatus: 'PENDING' },
      { addressStatus: 'PENDING' },
      { selfieStatus: 'PENDING' },
    ]);
    expect(arg.orderBy).toEqual({ createdAt: 'desc' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (from `server/`): `npm test -- admin-crm.service.spec`
Expected: FAIL — `service.kycQueue is not a function`.

- [ ] **Step 3: Implement `kycQueue`**

In `server/src/admin/admin-crm.service.ts`, add this method to the `AdminCrmService` class (use the existing `UserRole`; add `KycStepStatus` to the `@prisma/client` import if not already present):
```ts
  /** Clients with at least one KYC step awaiting review. */
  kycQueue() {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.CLIENT,
        kycProfile: {
          is: {
            OR: [
              { identityStatus: KycStepStatus.PENDING },
              { addressStatus: KycStepStatus.PENDING },
              { selfieStatus: KycStepStatus.PENDING },
            ],
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        country: true,
        kycProfile: { select: { identityStatus: true, addressStatus: true, selfieStatus: true } },
      },
    });
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- admin-crm.service.spec`
Expected: PASS.

- [ ] **Step 5: Add the controller route**

In `server/src/admin/admin-crm.controller.ts`, add (near the clients routes):
```ts
  @Get('kyc/queue')
  kycQueue() {
    return this.crm.kycQueue();
  }
```

- [ ] **Step 6: Typecheck + full suite + commit**

Run: `npm run typecheck` → clean. Run: `npm test` → all green.
```bash
git add server/src/admin/admin-crm.service.ts server/src/admin/admin-crm.controller.ts server/src/admin/admin-crm.service.spec.ts
git commit -m "feat(server): add server-side KYC pending queue endpoint"
```

---

### Task 2: Backend — characterization tests for client endpoints

**Files:**
- Modify: `server/src/admin/admin-crm.service.spec.ts`

**Interfaces:**
- Consumes: `AdminCrmService.listClients`, `getClient`, `addClientNote`.

- [ ] **Step 1: Add failing tests for the client methods**

Append to `server/src/admin/admin-crm.service.spec.ts`:
```ts
describe('AdminCrmService clients', () => {
  it('listClients adds a case-insensitive OR search filter', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { user: { findMany } } as any;
    const service = new AdminCrmService(prisma, {} as any, {} as any);

    await service.listClients('ada');

    const arg = findMany.mock.calls[0][0];
    expect(arg.where.role).toBe('CLIENT');
    expect(arg.where.OR).toEqual([
      { email: { contains: 'ada', mode: 'insensitive' } },
      { firstName: { contains: 'ada', mode: 'insensitive' } },
      { lastName: { contains: 'ada', mode: 'insensitive' } },
    ]);
  });

  it('getClient throws NotFound for a non-client user', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'x', role: 'ADMIN' }) } } as any;
    const service = new AdminCrmService(prisma, {} as any, {} as any);
    await expect(service.getClient('x')).rejects.toThrow('Client not found');
  });

  it('addClientNote writes an audit record', async () => {
    const create = jest.fn().mockResolvedValue({});
    const record = jest.fn().mockResolvedValue(undefined);
    const findUnique = jest.fn().mockResolvedValue({ id: 'c1', role: 'CLIENT', tradingAccounts: [], kycProfile: null, clientNotesAbout: [], tickets: [] });
    const prisma = { clientNote: { create }, user: { findUnique } } as any;
    const service = new AdminCrmService(prisma, {} as any, { record } as any);

    await service.addClientNote('staff1', 'c1', { body: 'hi' });

    expect(create).toHaveBeenCalledWith({ data: { clientId: 'c1', authorId: 'staff1', body: 'hi', pinned: false } });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'crm.client.note', entityId: 'c1' }));
  });
});
```
NOTE: open `admin-crm.service.ts` and confirm the constructor parameter order is `(prisma, ledger, audit)` — the mocks pass `(prisma, {}, audit)` accordingly. If `getClient`'s `include` shape differs, adjust the `findUnique` mock so it returns the fields `getClient` reads (the goal is a green, meaningful test, not a brittle one).

- [ ] **Step 2: Run the tests**

Run: `npm test -- admin-crm.service.spec`
Expected: PASS (all describe blocks).

- [ ] **Step 3: Commit**

```bash
git add server/src/admin/admin-crm.service.spec.ts
git commit -m "test(server): cover admin CRM client list/detail/notes"
```

---

### Task 3: Frontend — KYC page uses the queue + shows documents

**Files:**
- Modify: `src/lib/adminApi.ts` (add `getKycQueue`, `getKycDocuments`)
- Modify: `src/pages/admin/AdminKycPage.tsx` (source from queue; add document links)
- Create: `src/pages/admin/AdminKycPage.spec.tsx`

**Interfaces:**
- Consumes: `GET /admin/kyc/queue` (Task 1), `GET /kyc/documents/:userId`, `GET /kyc/document/:id`.
- Produces: `adminApi.getKycQueue()`, `adminApi.getKycDocuments(userId)`; the doc URL is built from the API base.

- [ ] **Step 1: Add the adminApi methods**

In `src/lib/adminApi.ts`, add to the `adminApi` object:
```ts
  // KYC queue + documents (staff)
  getKycQueue: () => api.get<ClientListItem[]>('/admin/kyc/queue'),
  getKycDocuments: (userId: string) =>
    api.get<{ id: string; step: string; fileName: string; mimeType: string | null; createdAt: string }[]>(
      `/kyc/documents/${userId}`,
    ),
```

- [ ] **Step 2: Write the failing page test**

Create `src/pages/admin/AdminKycPage.spec.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    getKycQueue: vi.fn().mockResolvedValue([
      {
        id: 'c1', email: 'ada@x.com', firstName: 'Ada', lastName: 'Lovelace', country: 'GB',
        status: 'ACTIVE', createdAt: '2026-01-01', _count: { tradingAccounts: 1 },
        kycProfile: { identityStatus: 'PENDING', addressStatus: 'APPROVED', selfieStatus: 'NOT_SUBMITTED' },
      },
    ]),
    getKycDocuments: vi.fn().mockResolvedValue([]),
    reviewKyc: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

import AdminKycPage from './AdminKycPage';

describe('AdminKycPage', () => {
  it('loads the KYC queue and shows the pending client', async () => {
    render(<AdminKycPage />);
    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());
    expect(screen.getByText('ada@x.com')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- AdminKycPage`
Expected: FAIL — the page still calls `listClients`, so `getKycQueue` mock isn't used / assertion mismatch.

- [ ] **Step 4: Update the page to use the queue + document links**

In `src/pages/admin/AdminKycPage.tsx`:
- Replace the data load `setClients(await adminApi.listClients())` with `setClients(await adminApi.getKycQueue())`, and remove the now-redundant client-side `pending` filter (the queue already returns only pending clients — render `clients` directly).
- For each client card, add a "View documents" affordance: on expand, call `adminApi.getKycDocuments(c.id)` and render each document as a link that opens the stream endpoint in a new tab:
```tsx
// doc href helper (top of file)
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api'
const docHref = (id: string) => `${API_BASE}/kyc/document/${id}`
```
Render fetched docs as `<a href={docHref(d.id)} target="_blank" rel="noreferrer">{d.step} — {d.fileName}</a>`.
Keep the existing approve/reject buttons and toast behavior unchanged.
NOTE: read the current page first and integrate minimally — preserve its layout, `kycLabel`/`kycTone`, and the ADMIN-only 403 toast handling.

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- AdminKycPage`
Expected: PASS.

- [ ] **Step 6: Typecheck + suite + commit**

Run: `npx tsc -b` → clean. Run: `npm test` → all green.
```bash
git add src/lib/adminApi.ts src/pages/admin/AdminKycPage.tsx src/pages/admin/AdminKycPage.spec.tsx
git commit -m "feat(web): KYC review sources server queue + links documents"
```

---

### Task 4: Frontend — tests for the Clients page (list + 360 + note)

**Files:**
- Create: `src/pages/admin/AdminClientsPage.spec.tsx`

**Interfaces:**
- Consumes: `AdminClientsPage` and the `adminApi` client methods it uses.

- [ ] **Step 1: Read the page, then write a test matching its real behavior**

First open `src/pages/admin/AdminClientsPage.tsx` and note: which `adminApi` methods it calls (`listClients`, `getClient`, `addClientNote`), how it renders the list, and how the 360 drawer opens. Then create `src/pages/admin/AdminClientsPage.spec.tsx` mocking `@/lib/adminApi` (and `@/context/ToastContext` if used) with a one-client list, and assert the client's name/email renders after load. Use this skeleton and adapt assertions to the real rendered text:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listClients: vi.fn().mockResolvedValue([
      {
        id: 'c1', email: 'ada@x.com', firstName: 'Ada', lastName: 'Lovelace', country: 'GB',
        status: 'ACTIVE', createdAt: '2026-01-01', _count: { tradingAccounts: 2 },
        kycProfile: { identityStatus: 'APPROVED', addressStatus: 'APPROVED', selfieStatus: 'APPROVED' },
      },
    ]),
    getClient: vi.fn(),
    addClientNote: vi.fn(),
  },
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

import AdminClientsPage from './AdminClientsPage';

describe('AdminClientsPage', () => {
  it('renders the client list from adminApi', async () => {
    render(<AdminClientsPage />);
    await waitFor(() => expect(screen.getByText(/Ada/)).toBeInTheDocument());
    expect(screen.getByText('ada@x.com')).toBeInTheDocument();
  });
});
```
If the page uses `useNavigate`, wrap it in `<MemoryRouter>` from `react-router-dom`.

- [ ] **Step 2: Run the test**

Run: `npm test -- AdminClientsPage`
Expected: PASS (adjust the assertion text to the page's real output until green and meaningful).

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminClientsPage.spec.tsx
git commit -m "test(web): cover admin clients list rendering"
```

---

## Self-Review

**Spec coverage (Phase 3 = Clients list + 360 drawer + notes, KYC review queue):**
- Clients list/360/notes — already built; now covered by tests (Tasks 2, 4). ✅
- KYC review queue — was client-side; now a real server endpoint (Task 1) consumed by the page, which also surfaces the documents staff are approving (Task 3). ✅
- Tests across the slice (Tasks 1–4). ✅

**Deliberately out of scope (separate plans):** Leads `convert` + auto-create-from-demo/registration and the `addLeadNote`/`replyTicket` audit gaps (Phase 5 — Leads/Support hardening); Finance/Accounts (Phase 4); client notifications on KYC decision (needs a Notification backend model — not yet present; track as a Phase 6/notifications decision).

**Placeholder scan:** No TBD/TODO. Backend test code is concrete. The two frontend tasks instruct "read the existing page, adapt assertions to its real output" — verification against the user's hand-written components (which exist and aren't reproduced here), not a placeholder.

**Type consistency:** `kycQueue` returns the `ClientListItem`-compatible shape the page consumes; `getKycQueue`/`getKycDocuments` added to `adminApi` and used by `AdminKycPage`. Constructor arg order `(prisma, ledger, audit)` flagged for confirmation in Task 2.

## Follow-on
- Phase 4 — Finance (withdrawal approvals via LedgerService) + Accounts admin.
- Phase 5 — Leads (convert + auto-create) + Support hardening + audit-gap fixes + wire portal support to tickets.
- Phase 6 — Partners, Reports, Staff/Settings, Audit-log viewer, notifications.
