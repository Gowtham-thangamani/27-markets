import { envSchema } from './env.validation';

/** Minimal env that satisfies every required field (rest have defaults). */
const base = {
  DATABASE_URL: 'postgres://localhost/test',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('env simulation rail', () => {
  it('accepts the safe defaults (simulation)', () => {
    expect(envSchema.safeParse(base).success).toBe(true);
  });

  it('blocks EXECUTION_PROVIDER=mt5 without ALLOW_LIVE_MODE', () => {
    const r = envSchema.safeParse({ ...base, EXECUTION_PROVIDER: 'mt5' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes('EXECUTION_PROVIDER'))).toBe(true);
    }
  });

  it('allows EXECUTION_PROVIDER=mt5 with ALLOW_LIVE_MODE=true', () => {
    const r = envSchema.safeParse({ ...base, EXECUTION_PROVIDER: 'mt5', ALLOW_LIVE_MODE: 'true' });
    expect(r.success).toBe(true);
  });

  it('blocks PSP_PROVIDER=stripe without ALLOW_LIVE_MODE', () => {
    const r = envSchema.safeParse({ ...base, PSP_PROVIDER: 'stripe' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes('PSP_PROVIDER'))).toBe(true);
    }
  });

  it('still blocks TRADING_MODE=LIVE without ALLOW_LIVE_MODE', () => {
    const r = envSchema.safeParse({ ...base, TRADING_MODE: 'LIVE' });
    expect(r.success).toBe(false);
  });
});
