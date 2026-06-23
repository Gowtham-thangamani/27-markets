# CRM Phase 1 — Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the backend groundwork for the CRM: a test harness, the two-tier staff role (`AGENT`), the new CRM data models (Lead, LeadNote, ClientNote, Ticket, TicketMessage), and a guarded `admin/` module that proves Admin+Agent access works end-to-end.

**Architecture:** Extend the existing NestJS app (do not create a new one). Add an `admin/` module whose routes are protected by the existing `RolesGuard` restricted to staff roles. Introduce the new Prisma models now so later phases (clients, KYC, finance, leads, support) have tables to build on. This phase ships no business logic beyond a `GET /admin/ping` health endpoint — its value is the foundation and the proven access model.

**Tech Stack:** NestJS 10, Prisma 5 (PostgreSQL), Jest 29 + ts-jest, `@prisma/client`, `nestjs-zod`/`class-validator` (existing conventions).

## Global Constraints

- All work is under `server/` (the NestJS backend). Run commands from `server/`.
- Money/ledger rules unchanged: SIMULATION rail stays on; this phase moves no funds.
- Roles enum is the single source of truth: `CLIENT | PARTNER | ADMIN | AGENT`.
- Staff = `ADMIN` and `AGENT`. Admin-only = `ADMIN`. Use `STAFF_ROLES` constant, never hard-code role lists in controllers.
- Follow existing patterns: per-route `@UseGuards(RolesGuard)` + `@Roles(...)`; `@CurrentUser()` for the authed user; `PrismaService` for DB access.
- A PostgreSQL database must be reachable via `DATABASE_URL` in `server/.env` for the migration steps.
- TypeScript must stay clean: `npm run typecheck` passes after every task.

---

### Task 1: Add a Jest test harness to the backend

**Files:**
- Modify: `server/package.json`
- Create: `server/jest.config.js`
- Create: `server/src/health/health.controller.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` runs Jest over `**/*.spec.ts`; later tasks rely on this.

- [ ] **Step 1: Add dev dependencies and test scripts**

In `server/package.json`, add to `scripts`:
```json
"test": "jest",
"test:watch": "jest --watch"
```
Add to `devDependencies`:
```json
"@nestjs/testing": "^10.4.4",
"@types/jest": "^29.5.12",
"@types/supertest": "^6.0.2",
"jest": "^29.7.0",
"supertest": "^7.0.0",
"ts-jest": "^29.2.5"
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: completes; `node_modules/.bin/jest` exists.

- [ ] **Step 3: Create the Jest config**

Create `server/jest.config.js`:
```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
};
```

- [ ] **Step 4: Write a smoke test for the existing HealthController**

Create `server/src/health/health.controller.spec.ts`:
```ts
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports ok', () => {
    const controller = new HealthController();
    const result = controller.check();
    expect(result.status).toBe('ok');
  });
});
```
NOTE: open `server/src/health/health.controller.ts` first and match the actual method name and return shape; adjust `check()`/`status` above to whatever it exposes.

- [ ] **Step 5: Run the test**

Run: `npm test`
Expected: PASS — 1 suite, 1 test.

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/package-lock.json server/jest.config.js server/src/health/health.controller.spec.ts
git commit -m "test(server): add Jest harness + health smoke test"
```

---

### Task 2: Add the AGENT role and staff-role helpers

**Files:**
- Modify: `server/prisma/schema.prisma` (the `UserRole` enum)
- Create: `server/src/common/roles.ts`
- Create: `server/src/common/roles.spec.ts`

**Interfaces:**
- Consumes: `UserRole` from `@prisma/client`.
- Produces:
  - `STAFF_ROLES: UserRole[]` = `[ADMIN, AGENT]`
  - `isStaff(role: UserRole): boolean`
  - `isAdmin(role: UserRole): boolean`

- [ ] **Step 1: Add AGENT to the enum**

In `server/prisma/schema.prisma`, change:
```prisma
enum UserRole {
  CLIENT
  PARTNER
  ADMIN
}
```
to:
```prisma
enum UserRole {
  CLIENT
  PARTNER
  ADMIN
  AGENT
}
```

- [ ] **Step 2: Regenerate the Prisma client**

Run: `npm run prisma:generate`
Expected: completes; `UserRole.AGENT` now exists in the generated client.

- [ ] **Step 3: Write the failing test for the helpers**

Create `server/src/common/roles.spec.ts`:
```ts
import { UserRole } from '@prisma/client';
import { STAFF_ROLES, isStaff, isAdmin } from './roles';

describe('role helpers', () => {
  it('STAFF_ROLES is exactly ADMIN and AGENT', () => {
    expect([...STAFF_ROLES].sort()).toEqual([UserRole.ADMIN, UserRole.AGENT].sort());
  });
  it('isStaff is true for ADMIN and AGENT', () => {
    expect(isStaff(UserRole.ADMIN)).toBe(true);
    expect(isStaff(UserRole.AGENT)).toBe(true);
  });
  it('isStaff is false for CLIENT and PARTNER', () => {
    expect(isStaff(UserRole.CLIENT)).toBe(false);
    expect(isStaff(UserRole.PARTNER)).toBe(false);
  });
  it('isAdmin is true only for ADMIN', () => {
    expect(isAdmin(UserRole.ADMIN)).toBe(true);
    expect(isAdmin(UserRole.AGENT)).toBe(false);
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm test -- roles.spec`
Expected: FAIL — cannot find module `./roles`.

- [ ] **Step 5: Implement the helpers**

Create `server/src/common/roles.ts`:
```ts
import { UserRole } from '@prisma/client';

/** The roles that may access the CRM back-office. */
export const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.AGENT];

/** True if the role may access the CRM (Admin or Agent). */
export const isStaff = (role: UserRole): boolean => STAFF_ROLES.includes(role);

/** True only for full administrators (finance approvals, role/staff mgmt, settings). */
export const isAdmin = (role: UserRole): boolean => role === UserRole.ADMIN;
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- roles.spec`
Expected: PASS — 4 tests.

- [ ] **Step 7: Create the migration**

Run: `npm run prisma:migrate -- --name add_agent_role`
Expected: a new folder under `server/prisma/migrations/` containing the enum alter; client regenerated.

- [ ] **Step 8: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.
```bash
git add server/prisma/schema.prisma server/prisma/migrations server/src/common/roles.ts server/src/common/roles.spec.ts
git commit -m "feat(server): add AGENT role + staff-role helpers"
```

---

### Task 3: Add CRM Prisma models (Lead, LeadNote, ClientNote, Ticket, TicketMessage)

**Files:**
- Modify: `server/prisma/schema.prisma` (new enums, new models, new back-relations on `User`)

**Interfaces:**
- Consumes: existing `User` model.
- Produces: Prisma models `Lead`, `LeadNote`, `ClientNote`, `Ticket`, `TicketMessage` and enums `LeadSource`, `LeadStatus`, `TicketPriority`, `TicketStatus`, available on `PrismaService` for later phases.

- [ ] **Step 1: Add the new enums**

Append to `server/prisma/schema.prisma`:
```prisma
// ─────────────────────────── CRM ───────────────────────────

enum LeadSource {
  DEMO
  REGISTER
  MANUAL
}

enum LeadStatus {
  NEW
  CONTACTED
  QUALIFIED
  CONVERTED
  LOST
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
}
```

- [ ] **Step 2: Add the new models**

Append to `server/prisma/schema.prisma`:
```prisma
model Lead {
  id              String     @id @default(cuid())
  name            String
  email           String
  phone           String?
  country         String?
  source          LeadSource @default(MANUAL)
  status          LeadStatus @default(NEW)
  assignedToId    String?
  assignedTo      User?      @relation("LeadAssignee", fields: [assignedToId], references: [id], onDelete: SetNull)
  convertedUserId String?
  convertedUser   User?      @relation("LeadConverted", fields: [convertedUserId], references: [id], onDelete: SetNull)
  notes           LeadNote[]
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@index([status])
  @@index([assignedToId])
}

model LeadNote {
  id        String   @id @default(cuid())
  leadId    String
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation("LeadNoteAuthor", fields: [authorId], references: [id])
  body      String
  createdAt DateTime @default(now())

  @@index([leadId])
}

model ClientNote {
  id        String   @id @default(cuid())
  clientId  String
  client    User     @relation("ClientNoteSubject", fields: [clientId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation("ClientNoteAuthor", fields: [authorId], references: [id])
  body      String
  pinned    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([clientId])
}

model Ticket {
  id           String          @id @default(cuid())
  userId       String
  user         User            @relation("TicketClient", fields: [userId], references: [id], onDelete: Cascade)
  subject      String
  category     String
  priority     TicketPriority  @default(MEDIUM)
  status       TicketStatus    @default(OPEN)
  assignedToId String?
  assignedTo   User?           @relation("TicketAssignee", fields: [assignedToId], references: [id], onDelete: SetNull)
  messages     TicketMessage[]
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  @@index([status])
  @@index([userId])
}

model TicketMessage {
  id        String   @id @default(cuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation("TicketMessageAuthor", fields: [authorId], references: [id])
  body      String
  internal  Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([ticketId])
}
```

- [ ] **Step 3: Add the back-relation fields to the User model**

In `server/prisma/schema.prisma`, inside `model User { ... }`, after the existing relation lines (`sessions`, `tradingAccounts`, `ledgerAccounts`, `kycProfile`, `auditLogs`), add:
```prisma
  assignedLeads       Lead[]          @relation("LeadAssignee")
  convertedFromLeads  Lead[]          @relation("LeadConverted")
  leadNotes           LeadNote[]      @relation("LeadNoteAuthor")
  clientNotesAbout    ClientNote[]    @relation("ClientNoteSubject")
  clientNotesAuthored ClientNote[]    @relation("ClientNoteAuthor")
  tickets             Ticket[]        @relation("TicketClient")
  assignedTickets     Ticket[]        @relation("TicketAssignee")
  ticketMessages      TicketMessage[] @relation("TicketMessageAuthor")
```

- [ ] **Step 4: Validate the schema (this is the test)**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀". If it reports a missing opposite relation, the back-relation name in Step 3 does not match the model relation name in Step 2 — fix the mismatched `@relation("...")` name.

- [ ] **Step 5: Create the migration and regenerate**

Run: `npm run prisma:migrate -- --name crm_foundation`
Then: `npm run prisma:generate`
Expected: new migration folder created; client regenerated with `prisma.lead`, `prisma.ticket`, etc.

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.
```bash
git add server/prisma/schema.prisma server/prisma/migrations
git commit -m "feat(server): add CRM models (Lead, LeadNote, ClientNote, Ticket, TicketMessage)"
```

---

### Task 4: Add the guarded admin module with a ping endpoint

**Files:**
- Create: `server/src/admin/admin.controller.ts`
- Create: `server/src/admin/admin.module.ts`
- Create: `server/src/admin/admin.controller.spec.ts`
- Create: `server/src/auth/guards/roles.guard.spec.ts`
- Modify: `server/src/app.module.ts`

**Interfaces:**
- Consumes: `RolesGuard` (`server/src/auth/guards/roles.guard.ts`), `STAFF_ROLES` (Task 2), `Roles`/`CurrentUser`/`AuthUser` (`server/src/common/decorators.ts`).
- Produces: `GET /admin/ping` → `{ ok: true, staff: { id, email, role } }`, accessible to ADMIN and AGENT only. `AdminModule` registered in `AppModule`.

- [ ] **Step 1: Write the failing RolesGuard two-tier test**

Create `server/src/auth/guards/roles.guard.spec.ts`:
```ts
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

const ctxWith = (role?: UserRole) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { id: 'u', email: 'e@x.com', role } : undefined }),
    }),
    getHandler: () => null,
    getClass: () => null,
  }) as any;

const reflectorFor = (roles?: UserRole[]) =>
  ({ getAllAndOverride: () => roles }) as unknown as Reflector;

describe('RolesGuard (two-tier staff access)', () => {
  it('allows ADMIN when staff roles required', () => {
    const guard = new RolesGuard(reflectorFor([UserRole.ADMIN, UserRole.AGENT]));
    expect(guard.canActivate(ctxWith(UserRole.ADMIN))).toBe(true);
  });
  it('allows AGENT when staff roles required', () => {
    const guard = new RolesGuard(reflectorFor([UserRole.ADMIN, UserRole.AGENT]));
    expect(guard.canActivate(ctxWith(UserRole.AGENT))).toBe(true);
  });
  it('denies CLIENT when staff roles required', () => {
    const guard = new RolesGuard(reflectorFor([UserRole.ADMIN, UserRole.AGENT]));
    expect(() => guard.canActivate(ctxWith(UserRole.CLIENT))).toThrow(ForbiddenException);
  });
  it('denies AGENT when only ADMIN required', () => {
    const guard = new RolesGuard(reflectorFor([UserRole.ADMIN]));
    expect(() => guard.canActivate(ctxWith(UserRole.AGENT))).toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 2: Write the failing AdminController test**

Create `server/src/admin/admin.controller.spec.ts`:
```ts
import { UserRole } from '@prisma/client';
import { AdminController } from './admin.controller';

describe('AdminController', () => {
  it('ping returns the staff identity', () => {
    const controller = new AdminController();
    const user = { id: 'a1', email: 'admin@27.com', role: UserRole.ADMIN };
    expect(controller.ping(user)).toEqual({ ok: true, staff: user });
  });
});
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `npm test -- admin.controller.spec roles.guard.spec`
Expected: FAIL — cannot find module `./admin.controller` (the guard spec also fails to compile because `AdminController` is missing only if co-bundled; if the guard spec compiles, it should already PASS since `RolesGuard` exists and `AGENT` is defined).

- [ ] **Step 4: Implement the AdminController**

Create `server/src/admin/admin.controller.ts`:
```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles, type AuthUser } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin')
export class AdminController {
  @Get('ping')
  ping(@CurrentUser() user: AuthUser) {
    return { ok: true, staff: { id: user.id, email: user.email, role: user.role } };
  }
}
```

- [ ] **Step 5: Implement the AdminModule**

Create `server/src/admin/admin.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';

@Module({
  controllers: [AdminController],
})
export class AdminModule {}
```

- [ ] **Step 6: Register AdminModule in AppModule**

In `server/src/app.module.ts`:
- Add the import near the other module imports:
```ts
import { AdminModule } from './admin/admin.module';
```
- Add `AdminModule` to the `imports` array (after `KycModule`).

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- admin.controller.spec roles.guard.spec`
Expected: PASS — 1 + 4 tests.

- [ ] **Step 8: Run the full suite and typecheck**

Run: `npm test`
Expected: all suites PASS.
Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 9: Manually verify the guard end-to-end (optional but recommended)**

Start the server (`npm run start:dev`), then with a valid JWT cookie/bearer:
- `GET /admin/ping` as an ADMIN or AGENT → `200 { ok: true, staff: {...} }`
- `GET /admin/ping` as a CLIENT → `403 Forbidden`

- [ ] **Step 10: Commit**

```bash
git add server/src/admin server/src/auth/guards/roles.guard.spec.ts server/src/app.module.ts
git commit -m "feat(server): add guarded admin module with /admin/ping (Admin+Agent)"
```

---

## Self-Review

**Spec coverage (Phase 1 rows of the spec build-phases):**
- "add `AGENT` role" → Task 2. ✅
- "Lead/LeadNote/ClientNote/Ticket/TicketMessage models + migration" → Task 3. ✅
- "`admin/` module scaffold with guards" → Task 4. ✅
- Test harness (precondition for TDD, absent in repo) → Task 1. ✅
- Later phases (admin shell, clients, KYC queue, finance, leads, support, reports/staff) are intentionally **out of scope** for this plan and will each get their own plan.

**Placeholder scan:** No TBD/TODO; every code step contains complete code. Task 1 Step 4 asks the implementer to match the real `HealthController` method name — this is verification against an existing file, not a placeholder.

**Type consistency:** `STAFF_ROLES`/`isStaff`/`isAdmin` defined in Task 2 and consumed in Task 4. `AuthUser` imported from `common/decorators` (confirmed exported). `@relation` names in Task 3 Step 2 match the back-relations in Step 3 (LeadAssignee, LeadConverted, LeadNoteAuthor, ClientNoteSubject, ClientNoteAuthor, TicketClient, TicketAssignee, TicketMessageAuthor). `ping()` return shape matches the assertion in Task 4 Step 2.

## Follow-on plans (not in this phase)
- Phase 2 — Admin shell (frontend `AdminLayout`, sidebar, `RequireStaff`, Dashboard KPIs).
- Phase 3 — Clients (list + 360 + notes) and KYC review queue.
- Phase 4 — Finance (withdrawal approvals) + Accounts admin.
- Phase 5 — Leads pipeline + Support desk (wire portal support to Ticket).
- Phase 6 — Partners stub + Reports + Staff/Settings + audit-log viewer.
