# Partner/IB Portal — Phase 1 (Foundation & Onboarding) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working referral foundation: public `/partner/apply` → admin approval that mints a PARTNER account + unique referral code + set-password invite, and referral attribution when a referred client registers via `?ref=CODE`.

**Architecture:** New NestJS `partners` module (public apply + admin application review). Approval runs one Prisma transaction (create PARTNER user + `PartnerProfile` with a unique code + `PARTNER_INVITE` token), reusing the existing verification-token + reset-password flow for set-password. Frontend adds a public apply page, a CRM applications page, and `?ref` capture on the register page. Mirrors the existing `leads` (public capture) and admin CRM patterns.

**Tech Stack:** NestJS + Prisma + Jest (backend); React 18 + TS + Vite + react-hook-form + Zod + Vitest (frontend).

## Global Constraints

- New models/fields only; one additive migration, no backfill. Money/ledger untouched (no commission in Phase 1).
- RBAC: `POST /partners/apply` is `@Public()` + throttled; `GET /admin/partner-applications` is STAFF (ADMIN+AGENT); approve/reject are **ADMIN only**.
- Referral code: 8-char Crockford base32 (uppercase, no `I L O U`), unique on `PartnerProfile.referralCode`.
- Approval when the email already belongs to a User → **409** (do not auto-promote).
- Invite link = `${CLIENT_ORIGIN}/reset-password?token=RAW`, always returned from approve (works without email).
- Emails stay best-effort (`.catch(() => undefined)`); never block the request.
- Test convention: backend Jest `*.spec.ts` (`cd server && npm test -- <name>`); frontend Vitest `*.spec.tsx` (`npx vitest run <file>`). Frontend typecheck `npx tsc --noEmit`; backend typecheck `cd server && npx tsc --noEmit`.

---

### Task 1: Prisma schema — partner models, relations, migration

**Files:**
- Modify: `server/prisma/schema.prisma`

**Interfaces:**
- Produces models `PartnerApplication`, `PartnerProfile`, enum `PartnerApplicationStatus`, enum value `VerificationTokenType.PARTNER_INVITE`, and User fields `partnerProfile`, `referredByPartnerId`, `referredByPartner`, `referredClients`, plus PartnerApplication back-relations.

- [ ] **Step 1: Add the enum value** to `VerificationTokenType`:

```prisma
enum VerificationTokenType {
  EMAIL_VERIFY
  PASSWORD_RESET
  PARTNER_INVITE
}
```

- [ ] **Step 2: Add the partner models** (place near the other domain models):

```prisma
enum PartnerApplicationStatus {
  PENDING
  APPROVED
  REJECTED
}

model PartnerApplication {
  id              String                   @id @default(cuid())
  firstName       String
  lastName        String
  email           String
  phone           String?
  country         String?
  company         String?
  website         String?
  audience        String?
  status          PartnerApplicationStatus @default(PENDING)
  notes           String?
  reviewedAt      DateTime?
  reviewedById    String?
  reviewedBy      User?                    @relation("PartnerAppReviewer", fields: [reviewedById], references: [id])
  resultingUserId String?                  @unique
  resultingUser   User?                    @relation("PartnerAppResult", fields: [resultingUserId], references: [id])
  createdAt       DateTime                 @default(now())

  @@index([status])
}

model PartnerProfile {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation("UserPartnerProfile", fields: [userId], references: [id], onDelete: Cascade)
  referralCode String   @unique
  createdAt    DateTime @default(now())
}
```

- [ ] **Step 3: Add the User relations/fields** inside `model User { ... }` (alongside the existing relation block):

```prisma
  partnerProfile      PartnerProfile?     @relation("UserPartnerProfile")
  referredByPartnerId String?
  referredByPartner   User?               @relation("PartnerReferrals", fields: [referredByPartnerId], references: [id])
  referredClients     User[]              @relation("PartnerReferrals")
  partnerAppsReviewed PartnerApplication[] @relation("PartnerAppReviewer")
  partnerAppResult    PartnerApplication?  @relation("PartnerAppResult")
```

- [ ] **Step 4: Create the migration and regenerate the client**

Run: `cd server && npx prisma migrate dev --name partner_foundation`
Expected: a new migration under `server/prisma/migrations/`, client regenerated, no SQL errors.

- [ ] **Step 5: Typecheck**

Run: `cd server && npx prisma generate && npx tsc --noEmit`
Expected: zero errors (the new types exist; nothing references them yet).

- [ ] **Step 6: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations
git commit -m "feat(partners): schema for applications, partner profiles, referral links"
```

---

### Task 2: Referral code generator (pure helper)

**Files:**
- Create: `server/src/partners/referral-code.ts`
- Test: `server/src/partners/referral-code.spec.ts`

**Interfaces:**
- Produces `generateReferralCode(rand?: () => number): string` — 8 chars from the Crockford-safe alphabet.

- [ ] **Step 1: Write the failing test**

```ts
import { generateReferralCode, REFERRAL_ALPHABET } from './referral-code';

describe('generateReferralCode', () => {
  it('returns an 8-char code from the safe alphabet', () => {
    const code = generateReferralCode();
    expect(code).toHaveLength(8);
    expect([...code].every((c) => REFERRAL_ALPHABET.includes(c))).toBe(true);
  });

  it('excludes ambiguous characters I, L, O, U', () => {
    expect(REFERRAL_ALPHABET).not.toMatch(/[ILOU]/);
  });

  it('is deterministic given a seeded rng', () => {
    const seq = [0, 0.5, 0.99, 0, 0.5, 0.99, 0, 0.5];
    let i = 0;
    const rand = () => seq[i++];
    expect(generateReferralCode(rand)).toBe(generateReferralCode(() => seq[(i = 0), i++]));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- referral-code`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// Crockford base32 minus ambiguous I, L, O, U.
export const REFERRAL_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** 8-char referral code. `rand` is injectable for deterministic tests. */
export function generateReferralCode(rand: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += REFERRAL_ALPHABET[Math.floor(rand() * REFERRAL_ALPHABET.length)];
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test -- referral-code`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/partners/referral-code.ts server/src/partners/referral-code.spec.ts
git commit -m "feat(partners): referral code generator"
```

---

### Task 3: Public apply endpoint (`partners` module)

**Files:**
- Create: `server/src/partners/dto.ts`, `server/src/partners/partners.service.ts`, `server/src/partners/partners.controller.ts`, `server/src/partners/partners.module.ts`
- Test: `server/src/partners/partners.service.spec.ts`
- Modify: `server/src/app.module.ts` (register `PartnersModule`)

**Interfaces:**
- Consumes: `generateReferralCode` (Task 2), Prisma `partnerApplication`.
- Produces: `PartnersService.apply(dto: ApplyPartnerDto): Promise<{ id: string }>`; `ApplyPartnerDto`; `POST /partners/apply` (`@Public`, throttled).
- (Admin methods are added in Task 4 on the same service.)

- [ ] **Step 1: Write the failing test**

```ts
import { PartnersService } from './partners.service';

describe('PartnersService.apply', () => {
  it('creates a PENDING application (lowercased email)', async () => {
    const created = { id: 'app1' };
    const prisma = { partnerApplication: { create: jest.fn().mockResolvedValue(created) } } as any;
    const audit = { record: jest.fn() } as any;
    const service = new PartnersService(prisma, audit);

    const res = await service.apply({
      firstName: 'Pat', lastName: 'Lee', email: 'Pat@Example.com', company: 'PatPromo',
    } as any);

    expect(res).toEqual({ id: 'app1' });
    expect(prisma.partnerApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'pat@example.com', status: 'PENDING' }) }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- partners.service`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the DTO**

```ts
// server/src/partners/dto.ts
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ApplyPartnerDto {
  @IsString() @MinLength(2) @MaxLength(60) firstName!: string;
  @IsString() @MinLength(2) @MaxLength(60) lastName!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsString() @MaxLength(120) company?: string;
  @IsOptional() @IsString() @MaxLength(200) website?: string;
  @IsOptional() @IsString() @MaxLength(2000) audience?: string;
}
```

- [ ] **Step 4: Write the service** (apply only; admin methods come in Task 4)

```ts
// server/src/partners/partners.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { ApplyPartnerDto } from './dto';

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async apply(dto: ApplyPartnerDto): Promise<{ id: string }> {
    const app = await this.prisma.partnerApplication.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        country: dto.country,
        company: dto.company,
        website: dto.website,
        audience: dto.audience,
        status: 'PENDING',
      },
    });
    await this.audit.record({ action: 'partner.application.create', entity: 'PartnerApplication', entityId: app.id });
    return { id: app.id };
  }
}
```

- [ ] **Step 5: Write the public controller**

```ts
// server/src/partners/partners.controller.ts
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators';
import { PartnersService } from './partners.service';
import { ApplyPartnerDto } from './dto';

@Controller('partners')
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('apply')
  apply(@Body() dto: ApplyPartnerDto) {
    return this.partners.apply(dto);
  }
}
```

- [ ] **Step 6: Write the module + register it**

```ts
// server/src/partners/partners.module.ts
import { Module } from '@nestjs/common';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({
  controllers: [PartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
```

Add `PartnersModule` to the `imports` array in `server/src/app.module.ts` (follow the existing import style).

- [ ] **Step 7: Run test + typecheck**

Run: `cd server && npm test -- partners.service && npx tsc --noEmit`
Expected: PASS, zero type errors.

- [ ] **Step 8: Commit**

```bash
git add server/src/partners server/src/app.module.ts
git commit -m "feat(partners): public application capture endpoint"
```

---

### Task 4: Admin review — list / approve / reject

**Files:**
- Modify: `server/src/partners/partners.service.ts` (add admin methods), `server/src/partners/dto.ts` (reject DTO)
- Create: `server/src/partners/admin-partners-applications.controller.ts`
- Modify: `server/src/partners/partners.module.ts` (register the admin controller)
- Test: `server/src/partners/partners.service.spec.ts` (extend)

**Interfaces:**
- Consumes: `generateReferralCode` (Task 2); `ConfigService` for `CLIENT_ORIGIN`.
- Produces on `PartnersService`:
  - `listApplications(status?: PartnerApplicationStatus)`
  - `approve(adminId: string, id: string): Promise<{ ok: true; referralCode: string; inviteUrl: string }>`
  - `reject(adminId: string, id: string, reason?: string): Promise<{ ok: true }>`
  - private `uniqueReferralCode(): Promise<string>`

- [ ] **Step 1: Write the failing tests** (append to `partners.service.spec.ts`)

```ts
import { BadRequestException, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('PartnersService.approve', () => {
  function deps(overrides: any = {}) {
    const prisma = {
      partnerApplication: {
        findUnique: jest.fn().mockResolvedValue({ id: 'app1', status: 'PENDING', email: 'p@x.io', firstName: 'Pat', lastName: 'Lee', phone: null, country: null }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'u1' }) },
      partnerProfile: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
      verificationToken: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (fn: any) => fn(prismaTx)),
      ...overrides,
    };
    const prismaTx = prisma; // same shape inside the tx callback
    const audit = { record: jest.fn() } as any;
    const config = { get: jest.fn().mockReturnValue('https://app.example') } as any;
    return { prisma, audit, config };
  }

  it('creates a partner user + profile + invite token and returns code + inviteUrl', async () => {
    const { prisma, audit, config } = deps();
    const { PartnersService } = require('./partners.service');
    const service = new PartnersService(prisma, audit, config);
    const res = await service.approve('admin1', 'app1');
    expect(res.ok).toBe(true);
    expect(res.referralCode).toHaveLength(8);
    expect(res.inviteUrl).toContain('https://app.example/reset-password?token=');
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: 'PARTNER' }) }));
  });

  it('rejects a non-PENDING application with 400', async () => {
    const { prisma, audit, config } = deps();
    prisma.partnerApplication.findUnique.mockResolvedValue({ id: 'app1', status: 'APPROVED' });
    const { PartnersService } = require('./partners.service');
    const service = new PartnersService(prisma, audit, config);
    await expect(service.approve('admin1', 'app1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the email already has a user (409)', async () => {
    const { prisma, audit, config } = deps();
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
    const { PartnersService } = require('./partners.service');
    const service = new PartnersService(prisma, audit, config);
    await expect(service.approve('admin1', 'app1')).rejects.toBeInstanceOf(ConflictException);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npm test -- partners.service`
Expected: FAIL — `approve` not a function / constructor arity mismatch.

- [ ] **Step 3: Add the reject DTO** to `server/src/partners/dto.ts`

```ts
export class RejectApplicationDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
```

- [ ] **Step 4: Extend the service** (add imports + ConfigService + admin methods)

```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import { PartnerApplicationStatus, UserRole, VerificationTokenType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { generateReferralCode } from './referral-code';
import type { Env } from '../config/env.validation';
import type { ApplyPartnerDto } from './dto';

// constructor becomes:
//   constructor(prisma, audit, private readonly config: ConfigService<Env, true>) {}

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async uniqueReferralCode(): Promise<string> {
    for (let i = 0; i < 6; i++) {
      const code = generateReferralCode();
      const clash = await this.prisma.partnerProfile.findUnique({ where: { referralCode: code } });
      if (!clash) return code;
    }
    throw new Error('Could not generate a unique referral code');
  }

  listApplications(status?: PartnerApplicationStatus) {
    return this.prisma.partnerApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async approve(adminId: string, id: string): Promise<{ ok: true; referralCode: string; inviteUrl: string }> {
    const app = await this.prisma.partnerApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== PartnerApplicationStatus.PENDING) throw new BadRequestException('Application is not pending');

    const email = app.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('A user with this email already exists; resolve manually');
    }

    const referralCode = await this.uniqueReferralCode();
    const rawToken = randomBytes(32).toString('hex');
    const randomPassword = await argon2.hash(randomBytes(24).toString('hex'), { type: argon2.argon2id });

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: randomPassword,
          firstName: app.firstName,
          lastName: app.lastName,
          phone: app.phone,
          country: app.country,
          role: UserRole.PARTNER,
          emailVerified: true,
          acceptedTermsAt: new Date(),
          partnerProfile: { create: { referralCode } },
        },
      });
      await tx.verificationToken.create({
        data: {
          userId: user.id,
          type: VerificationTokenType.PARTNER_INVITE,
          tokenHash: this.hashToken(rawToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      await tx.partnerApplication.update({
        where: { id },
        data: { status: PartnerApplicationStatus.APPROVED, reviewedAt: new Date(), reviewedById: adminId, resultingUserId: user.id },
      });
    });

    await this.audit.record({ userId: adminId, action: 'partner.application.approve', entity: 'PartnerApplication', entityId: id, metadata: { referralCode } });
    const origin = this.config.get('CLIENT_ORIGIN', { infer: true });
    return { ok: true, referralCode, inviteUrl: `${origin}/reset-password?token=${rawToken}` };
  }

  async reject(adminId: string, id: string, reason?: string): Promise<{ ok: true }> {
    const app = await this.prisma.partnerApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== PartnerApplicationStatus.PENDING) throw new BadRequestException('Application is not pending');
    await this.prisma.partnerApplication.update({
      where: { id },
      data: { status: PartnerApplicationStatus.REJECTED, reviewedAt: new Date(), reviewedById: adminId, notes: reason },
    });
    await this.audit.record({ userId: adminId, action: 'partner.application.reject', entity: 'PartnerApplication', entityId: id, metadata: { reason } });
    return { ok: true };
  }
```

> Note: the test stubs `$transaction` to invoke its callback with the same prisma mock, so `tx.*` calls resolve against the mocked methods.

- [ ] **Step 5: Write the admin controller**

```ts
// server/src/partners/admin-partners-applications.controller.ts
import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PartnerApplicationStatus, UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { PartnersService } from './partners.service';
import { RejectApplicationDto } from './dto';

@UseGuards(RolesGuard)
@Controller('admin/partner-applications')
export class AdminPartnerApplicationsController {
  constructor(private readonly partners: PartnersService) {}

  @Roles(...STAFF_ROLES)
  @Get()
  list(@Query('status') status?: PartnerApplicationStatus) {
    return this.partners.listApplications(status);
  }

  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  @Post(':id/approve')
  approve(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.partners.approve(adminId, id);
  }

  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  @Post(':id/reject')
  reject(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: RejectApplicationDto) {
    return this.partners.reject(adminId, id, dto.reason);
  }
}
```

Register `AdminPartnerApplicationsController` in `partners.module.ts` `controllers` array. Ensure `ConfigModule` is available (it is global in this app; if `ConfigService` injection fails, import `ConfigModule` in `PartnersModule`).

- [ ] **Step 6: Run tests + typecheck**

Run: `cd server && npm test -- partners.service && npx tsc --noEmit`
Expected: PASS (apply + 3 approve tests), zero type errors.

- [ ] **Step 7: Commit**

```bash
git add server/src/partners
git commit -m "feat(partners): admin review — list, approve (mint partner+code+invite), reject"
```

---

### Task 5: Auth — accept PARTNER_INVITE on reset; capture `?ref` on register

**Files:**
- Modify: `server/src/auth/auth.service.ts` (widen `consumeToken`/`resetPassword`; referral lookup in `register`), `server/src/auth/dto.ts` (`ref` on `RegisterDto`)
- Test: `server/src/auth/auth.service.spec.ts` (extend)

**Interfaces:**
- Consumes: Prisma `partnerProfile`.
- Produces: `register` sets `referredByPartnerId` when a valid `ref` is supplied; `resetPassword` accepts `PASSWORD_RESET` or `PARTNER_INVITE` tokens.

- [ ] **Step 1: Write the failing test** (append; mirror the existing spec's prisma-mock style)

```ts
it('register attributes the client to a partner when ref matches a referral code', async () => {
  // Arrange a prisma mock where partnerProfile.findUnique returns a partner userId.
  // (Follow the existing auth.service.spec mock setup; assert user.create was called
  //  with data.referredByPartnerId === 'partnerUser1' when dto.ref = 'CODE1234'.)
  // See existing register tests in this file for the mock scaffold to copy.
});
```

> The implementer copies the existing `register` test's mock scaffold in this same file, adds `partnerProfile: { findUnique: jest.fn().mockResolvedValue({ userId: 'partnerUser1' }) }`, passes `ref: 'CODE1234'`, and asserts `prisma.user.create` was called with `data.referredByPartnerId === 'partnerUser1'`. Also add a second case: unknown ref → `partnerProfile.findUnique` returns null → `referredByPartnerId` is null/undefined and registration still succeeds.

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npm test -- auth.service`
Expected: FAIL — `referredByPartnerId` not set.

- [ ] **Step 3: Add `ref` to `RegisterDto`** (`server/src/auth/dto.ts`)

```ts
  @IsOptional()
  @IsString()
  @MaxLength(16)
  ref?: string;
```

- [ ] **Step 4: Widen `consumeToken` + `resetPassword`** in `auth.service.ts`

```ts
  private async consumeToken(raw: string, type: VerificationTokenType | VerificationTokenType[]) {
    const token = await this.prisma.verificationToken.findFirst({
      where: { tokenHash: this.hashToken(raw), type: Array.isArray(type) ? { in: type } : type },
    });
    if (!token || token.usedAt || token.expiresAt < new Date()) {
      throw new BadRequestException('This link is invalid or has expired.');
    }
    await this.prisma.verificationToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
    return token;
  }

  // in resetPassword, change the consume call to accept invites too:
  const token = await this.consumeToken(rawToken, [
    VerificationTokenType.PASSWORD_RESET,
    VerificationTokenType.PARTNER_INVITE,
  ]);
```

- [ ] **Step 5: Resolve `ref` in `register`** — before `prisma.user.create`, add:

```ts
    const referredByPartnerId = dto.ref
      ? (await this.prisma.partnerProfile.findUnique({ where: { referralCode: dto.ref.toUpperCase() } }))?.userId ?? null
      : null;
```

and add `referredByPartnerId,` to the `data: { ... }` of `prisma.user.create`.

- [ ] **Step 6: Run tests + typecheck**

Run: `cd server && npm test -- auth.service && npx tsc --noEmit`
Expected: PASS, zero type errors.

- [ ] **Step 7: Commit**

```bash
git add server/src/auth/auth.service.ts server/src/auth/dto.ts server/src/auth/auth.service.spec.ts
git commit -m "feat(auth): accept partner invite tokens on reset; capture referral on register"
```

---

### Task 6: Partner list shows referral code + referred-client count

**Files:**
- Modify: `server/src/admin/admin-partners.service.ts`

**Interfaces:**
- Produces: `listPartners()` rows now include `partnerProfile: { referralCode } | null` and `_count: { referredClients }`.

- [ ] **Step 1: Update the query**

```ts
  listPartners() {
    return this.prisma.user.findMany({
      where: { role: UserRole.PARTNER },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, firstName: true, lastName: true, email: true, country: true, status: true, createdAt: true,
        partnerProfile: { select: { referralCode: true } },
        _count: { select: { referredClients: true } },
      },
    });
  }
```

- [ ] **Step 2: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/admin/admin-partners.service.ts
git commit -m "feat(partners): surface referral code + referred-client count in admin list"
```

---

### Task 7: Frontend API client + types

**Files:**
- Create: `src/lib/partnersApi.ts`

**Interfaces:**
- Produces: `partnersApi.apply(body)`, `partnersApi.listApplications(status?)`, `partnersApi.approve(id)`, `partnersApi.reject(id, reason?)`; types `PartnerApplication`, `PartnerApplicationStatus`, `ApproveResult`.

- [ ] **Step 1: Implement** (mirror `src/lib/adminApi.ts` which uses `api.get/post` from `./api`)

```ts
import { api } from './api'

export type PartnerApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface PartnerApplication {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  country: string | null
  company: string | null
  website: string | null
  audience: string | null
  status: PartnerApplicationStatus
  notes: string | null
  createdAt: string
  reviewedAt: string | null
  resultingUserId: string | null
}

export interface ApplyPartnerBody {
  firstName: string; lastName: string; email: string
  phone?: string; country?: string; company?: string; website?: string; audience?: string
}

export interface ApproveResult { ok: true; referralCode: string; inviteUrl: string }

export const partnersApi = {
  apply: (body: ApplyPartnerBody) => api.post<{ id: string }>('/partners/apply', body),
  listApplications: (status?: PartnerApplicationStatus) =>
    api.get<PartnerApplication[]>(`/admin/partner-applications${status ? `?status=${status}` : ''}`),
  approve: (id: string) => api.post<ApproveResult>(`/admin/partner-applications/${id}/approve`, {}),
  reject: (id: string, reason?: string) =>
    api.post<{ ok: true }>(`/admin/partner-applications/${id}/reject`, { reason }),
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` (errors only where pages don't yet exist — none here).

```bash
git add src/lib/partnersApi.ts
git commit -m "feat(web): partners API client + types"
```

---

### Task 8: Public `/partner/apply` page

**Files:**
- Create: `src/pages/PartnerApplyPage.tsx`
- Test: `src/pages/PartnerApplyPage.spec.tsx`
- Modify: `src/App.tsx` (add the route inside the marketing/public layout)

**Interfaces:**
- Consumes: `partnersApi.apply` (Task 7), existing UI `Input`/`Button`/`useToast` (see `RegisterPage.tsx` for exact props).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import PartnerApplyPage from './PartnerApplyPage'
import { partnersApi } from '@/lib/partnersApi'

vi.mock('@/lib/partnersApi', () => ({ partnersApi: { apply: vi.fn().mockResolvedValue({ id: 'a1' }) } }))

it('submits an application and shows the success state', async () => {
  render(<MemoryRouter><PartnerApplyPage /></MemoryRouter>)
  await userEvent.type(screen.getByLabelText(/first name/i), 'Pat')
  await userEvent.type(screen.getByLabelText(/last name/i), 'Lee')
  await userEvent.type(screen.getByLabelText(/email/i), 'pat@example.com')
  await userEvent.click(screen.getByRole('button', { name: /apply|submit/i }))
  await waitFor(() => expect(partnersApi.apply).toHaveBeenCalled())
  expect(await screen.findByText(/thank you|received|under review/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/PartnerApplyPage.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the page** (react-hook-form + Zod; mirror `RegisterPage.tsx` patterns and `Input`/`Button` props)

```tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { partnersApi } from '@/lib/partnersApi'

const schema = z.object({
  firstName: z.string().min(2, 'Required'),
  lastName: z.string().min(2, 'Required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().max(32).optional().or(z.literal('')),
  country: z.string().max(80).optional().or(z.literal('')),
  company: z.string().max(120).optional().or(z.literal('')),
  website: z.string().max(200).optional().or(z.literal('')),
  audience: z.string().max(2000).optional().or(z.literal('')),
})
type FormValues = z.infer<typeof schema>

export default function PartnerApplyPage() {
  const toast = useToast()
  const [done, setDone] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (v: FormValues) => {
    try {
      await partnersApi.apply({
        firstName: v.firstName, lastName: v.lastName, email: v.email,
        phone: v.phone || undefined, country: v.country || undefined,
        company: v.company || undefined, website: v.website || undefined, audience: v.audience || undefined,
      })
      setDone(true)
    } catch (e) {
      toast.error('Could not submit', e instanceof ApiError ? e.message : 'Please try again.')
    }
  }

  if (done) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-3xl font-bold text-white">Application received</h1>
        <p className="mt-3 text-gray-400">Thank you — your partner application is under review. We'll be in touch by email.</p>
      </div>
    )
  }

  return (
    <div className="container-x max-w-2xl py-16">
      <h1 className="font-display text-3xl font-bold text-white">Become a partner</h1>
      <p className="mt-2 text-gray-400">Apply to the 27 Markets IB program. Approved partners get a referral link and a partner dashboard.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-4 sm:grid-cols-2">
        <Input label="First name" {...register('firstName')} error={errors.firstName?.message} />
        <Input label="Last name" {...register('lastName')} error={errors.lastName?.message} />
        <Input label="Email" type="email" className="sm:col-span-2" {...register('email')} error={errors.email?.message} />
        <Input label="Phone" {...register('phone')} error={errors.phone?.message} />
        <Input label="Country" {...register('country')} error={errors.country?.message} />
        <Input label="Company / brand" {...register('company')} error={errors.company?.message} />
        <Input label="Website" {...register('website')} error={errors.website?.message} />
        <Input label="Audience / how you'll promote" className="sm:col-span-2" {...register('audience')} error={errors.audience?.message} />
        <Button type="submit" size="lg" loading={isSubmitting} className="sm:col-span-2">Apply</Button>
      </form>
    </div>
  )
}
```

> If `Input` does not forward refs / accept `{...register()}` (check `RegisterPage.tsx`), use the same Controller/registration approach RegisterPage uses. Keep labels matching the test's `getByLabelText`.

- [ ] **Step 4: Add the route** in `src/App.tsx` inside the `MarketingLayout` route group:

```tsx
<Route path="/partner/apply" element={<PartnerApplyPage />} />
```

(plus the import at the top, matching the file's import style).

- [ ] **Step 5: Run test + typecheck**

Run: `npx vitest run src/pages/PartnerApplyPage.spec.tsx && npx tsc --noEmit`
Expected: PASS, zero new type errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PartnerApplyPage.tsx src/pages/PartnerApplyPage.spec.tsx src/App.tsx
git commit -m "feat(web): public /partner/apply page"
```

---

### Task 9: CRM `/admin/partner-applications` page

**Files:**
- Create: `src/pages/admin/AdminPartnerApplicationsPage.tsx`
- Test: `src/pages/admin/AdminPartnerApplicationsPage.spec.tsx`
- Modify: `src/components/admin/adminNav.ts` (add nav item), `src/App.tsx` (add route under `/admin`)

**Interfaces:**
- Consumes: `partnersApi` (Task 7); UI `Badge`/`Button`/`EmptyState`/`ErrorState`/`SkeletonRows`, `PageTitle`, `useToast` (see `AdminKycPage.tsx` for exact usage).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import AdminPartnerApplicationsPage from './AdminPartnerApplicationsPage'
import { partnersApi } from '@/lib/partnersApi'

vi.mock('@/lib/partnersApi', () => ({
  partnersApi: {
    listApplications: vi.fn().mockResolvedValue([
      { id: 'a1', firstName: 'Pat', lastName: 'Lee', email: 'pat@x.io', phone: null, country: 'UK', company: 'PatPromo', website: null, audience: null, status: 'PENDING', notes: null, createdAt: '2026-06-29T00:00:00Z', reviewedAt: null, resultingUserId: null },
    ]),
    approve: vi.fn().mockResolvedValue({ ok: true, referralCode: 'ABCD2345', inviteUrl: 'https://app/reset-password?token=xyz' }),
    reject: vi.fn().mockResolvedValue({ ok: true }),
  },
}))

it('lists applications and reveals the invite link on approve', async () => {
  render(<MemoryRouter><AdminPartnerApplicationsPage /></MemoryRouter>)
  expect(await screen.findByText('pat@x.io')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /approve/i }))
  await waitFor(() => expect(partnersApi.approve).toHaveBeenCalledWith('a1'))
  expect(await screen.findByText(/ABCD2345/)).toBeInTheDocument()
  expect(screen.getByText(/reset-password\?token=xyz/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/admin/AdminPartnerApplicationsPage.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the page** (mirror `AdminKycPage.tsx`: `useState`/`useCallback` load, `PageTitle`, `SkeletonRows`, `ErrorState`, `EmptyState`, `Badge`, `Button`, `useToast`)

```tsx
import { useCallback, useEffect, useState } from 'react'
import { Handshake, Check, X, Copy } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { partnersApi, type PartnerApplication, type ApproveResult } from '@/lib/partnersApi'

export default function AdminPartnerApplicationsPage() {
  const toast = useToast()
  const [apps, setApps] = useState<PartnerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [invites, setInvites] = useState<Record<string, ApproveResult>>({})

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setApps(await partnersApi.listApplications()) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const approve = async (id: string) => {
    setBusy(id)
    try {
      const res = await partnersApi.approve(id)
      setInvites((p) => ({ ...p, [id]: res }))
      toast.success('Approved', `Referral code ${res.referralCode}`)
      await load()
    } catch (e) {
      toast.error('Approve failed', e instanceof ApiError ? e.message : (e as Error).message)
    } finally { setBusy(null) }
  }

  const reject = async (id: string) => {
    setBusy(id)
    try { await partnersApi.reject(id); toast.success('Rejected', 'Application rejected.'); await load() }
    catch (e) { toast.error('Reject failed', e instanceof ApiError ? e.message : (e as Error).message) }
    finally { setBusy(null) }
  }

  return (
    <>
      <PageTitle title="Partner Applications" subtitle="Review and approve IB applications." />
      {error ? <ErrorState description={error} onRetry={load} />
        : loading ? <SkeletonRows rows={4} />
        : apps.length === 0 ? <EmptyState icon={Handshake} title="No applications" description="No partner applications yet." />
        : (
          <div className="space-y-3">
            {apps.map((a) => {
              const invite = invites[a.id]
              return (
                <div key={a.id} className="glass-panel p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-white">{a.firstName} {a.lastName} <span className="ml-2 text-xs text-gray-500">{a.company}</span></div>
                      <div className="text-xs text-gray-500">{a.email}{a.country ? ` · ${a.country}` : ''}{a.website ? ` · ${a.website}` : ''}</div>
                      {a.audience && <div className="mt-1 text-sm text-gray-400">{a.audience}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={a.status === 'PENDING' ? 'warning' : a.status === 'APPROVED' ? 'success' : 'danger'} dot>{a.status}</Badge>
                      {a.status === 'PENDING' && (
                        <>
                          <Button size="sm" variant="outline" loading={busy === a.id} onClick={() => approve(a.id)} className="gap-1 border-success/40 text-success hover:bg-success/10"><Check className="h-3.5 w-3.5" /> Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => reject(a.id)} className="gap-1 border-danger/40 text-danger hover:bg-danger/10"><X className="h-3.5 w-3.5" /> Reject</Button>
                        </>
                      )}
                    </div>
                  </div>
                  {invite && (
                    <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
                      <div className="text-white">Referral code: <span className="font-mono text-success">{invite.referralCode}</span></div>
                      <button
                        className="mt-1 inline-flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200"
                        onClick={() => { void navigator.clipboard?.writeText(invite.inviteUrl); toast.success('Copied', 'Invite link copied.') }}
                      >
                        <Copy className="h-3.5 w-3.5" /> {invite.inviteUrl}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
    </>
  )
}
```

> Confirm `Badge` tone names (`warning`/`success`/`danger`) against `@/components/ui` / `adminMaps`; adjust to the real tone union if different.

- [ ] **Step 4: Add nav + route**

In `src/components/admin/adminNav.ts` add (import `Handshake` is already imported there):

```ts
  { label: 'Partner Applications', to: '/admin/partner-applications', icon: Handshake },
```

In `src/App.tsx`, under the `/admin` route group, add:

```tsx
<Route path="partner-applications" element={<AdminPartnerApplicationsPage />} />
```

(plus the import).

- [ ] **Step 5: Run test + typecheck**

Run: `npx vitest run src/pages/admin/AdminPartnerApplicationsPage.spec.tsx && npx tsc --noEmit`
Expected: PASS, zero new type errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/AdminPartnerApplicationsPage.tsx src/pages/admin/AdminPartnerApplicationsPage.spec.tsx src/components/admin/adminNav.ts src/App.tsx
git commit -m "feat(web): CRM partner-applications review page"
```

---

### Task 10: Register page captures `?ref`

**Files:**
- Modify: `src/pages/auth/RegisterPage.tsx`
- Test: `src/pages/auth/RegisterPage.spec.tsx` (create)

**Interfaces:**
- Consumes: existing register submit path; `useSearchParams` (already used in the file for `account`).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import RegisterPage from './RegisterPage'

// Mock AuthContext.register to capture the payload; mock api as needed.
const registerMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ register: registerMock }) }))

it('shows a referred-by-partner note when ?ref is present', () => {
  render(
    <MemoryRouter initialEntries={['/register?ref=ABCD2345']}>
      <RegisterPage />
    </MemoryRouter>,
  )
  expect(screen.getByText(/referred by a partner/i)).toBeInTheDocument()
})
```

> If `RegisterPage` reads auth/data via other contexts, the implementer wires the minimal mocks the file requires (follow imports at the top of `RegisterPage.tsx`). The behavioral assertion that matters: when `?ref=CODE` is in the URL, the code is captured and (a) a "referred by a partner" note shows, and (b) the code is included in the register payload.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/auth/RegisterPage.spec.tsx`
Expected: FAIL — no such note.

- [ ] **Step 3: Implement** — in `RegisterPage.tsx`:
  - Read the code: `const ref = params.get('ref') ?? undefined` (the file already has `const [params] = useSearchParams()` / `params.get('account')`).
  - Include it in the register payload object passed to the API/AuthContext (add `ref` alongside email/password/etc. in the existing submit handler).
  - Render a subtle note when `ref` is set, e.g. near the form heading:

```tsx
{ref && (
  <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/[0.08] px-3 py-1 text-xs text-brand-300">
    Referred by a partner
  </p>
)}
```

- [ ] **Step 4: Run test + full check**

Run: `npx vitest run src/pages/auth/RegisterPage.spec.tsx && npx tsc --noEmit && npm run build`
Expected: PASS, zero type errors, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/auth/RegisterPage.tsx src/pages/auth/RegisterPage.spec.tsx
git commit -m "feat(web): capture ?ref referral code on register"
```

---

## Self-Review Notes

- **Spec coverage:** models + migration (Task 1); referral code (Task 2); public apply (Task 3); admin list/approve/reject with invite (Task 4); set-password reuse + `?ref` capture (Task 5); partner list enrichment (Task 6); API client (Task 7); apply page (Task 8); CRM page (Task 9); register `?ref` UI (Task 10). All §4–§9 spec items map to a task.
- **RBAC:** apply `@Public`+throttled (Task 3); list STAFF, approve/reject ADMIN (Task 4) — asserted by controller `@Roles`; the approve-only-ADMIN path is enforced server-side (a dedicated RBAC e2e is deferred to the existing role-sweep, noted here as the one ⚠️ a reviewer should confirm).
- **Type consistency:** `ApproveResult { ok, referralCode, inviteUrl }` is identical in service (Task 4), API client (Task 7), and CRM page (Task 9). `referredByPartnerId` name is consistent across schema (Task 1), auth (Task 5), and admin count (Task 6).
- **Known soft spots for the implementer (flagged inline):** exact `Input` ref-forwarding and `Badge` tone union must be confirmed against the real components (`RegisterPage.tsx` / `adminMaps`); the auth referral test reuses the existing spec's mock scaffold rather than re-specifying it.
- **Out of scope (later phases):** partner portal UI/dashboard, commission config/engine, two-tier, payouts.
