/**
 * One-time admin provisioning — the production-safe replacement for the demo seed.
 *
 * The demo seed (`prisma/seed.ts`) creates well-known default credentials and
 * self-aborts in production. Use THIS script to create (or rotate) the first real
 * ADMIN, reading the password from a secret so it never lives in source control.
 *
 *   ADMIN_EMAIL=you@firm.com ADMIN_PASSWORD='<strong-secret>' npm run admin:create
 *
 * Optional: ADMIN_FIRST_NAME, ADMIN_LAST_NAME (default "Platform"/"Admin").
 *
 * Idempotent: re-running with the same email ROTATES that admin's password and
 * re-asserts role=ADMIN + status=ACTIVE. Set the password via your host's secret
 * manager (Render/Railway env), run once, then unset it.
 */
import { PrismaClient, UserRole, UserStatus } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

// Passwords that must never be accepted (the retired demo defaults).
const BANNED_PASSWORDS = new Set(['Admin123!', 'Agent123!', 'Client123!', 'Partner123!'])

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

/** Minimal strength gate: length + character variety. */
function assertStrongPassword(password: string): void {
  if (BANNED_PASSWORDS.has(password)) {
    fail('ADMIN_PASSWORD is one of the retired demo defaults. Choose a new, unique password.')
  }
  if (password.length < 12) {
    fail('ADMIN_PASSWORD must be at least 12 characters.')
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  if (classes < 3) {
    fail('ADMIN_PASSWORD must mix at least 3 of: lowercase, uppercase, digits, symbols.')
  }
}

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD ?? ''
  const firstName = (process.env.ADMIN_FIRST_NAME ?? 'Platform').trim()
  const lastName = (process.env.ADMIN_LAST_NAME ?? 'Admin').trim()

  if (!email) fail('ADMIN_EMAIL is required.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(`ADMIN_EMAIL "${email}" is not a valid email address.`)
  if (!password) fail('ADMIN_PASSWORD is required (supply it via a secret, not the command line history).')
  assertStrongPassword(password)

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } })

  const user = await prisma.user.upsert({
    where: { email },
    // Rotate password + re-assert admin role/active status on an existing account.
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      kycProfile: { create: {} },
    },
    select: { id: true, email: true },
  })

  const action = existing ? 'Rotated password for existing admin' : 'Created new admin'
  console.log(`\n✔ ${action}: ${user.email} (id ${user.id})`)
  console.log('  Password was read from ADMIN_PASSWORD and is not printed. Unset that secret now.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
