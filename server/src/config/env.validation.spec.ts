import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgresql://x',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
  JWT_REFRESH_SECRET: 'b'.repeat(40),
};

describe('validateEnv — live-rail guards', () => {
  it('accepts the default simulation config', () => {
    expect(() => validateEnv({ ...base })).not.toThrow();
  });

  it('blocks EXECUTION_PROVIDER=mt5 without ALLOW_LIVE_MODE', () => {
    expect(() => validateEnv({ ...base, EXECUTION_PROVIDER: 'mt5' })).toThrow(/EXECUTION_PROVIDER/);
  });

  it('allows EXECUTION_PROVIDER=mt5 when ALLOW_LIVE_MODE=true', () => {
    expect(() => validateEnv({ ...base, EXECUTION_PROVIDER: 'mt5', ALLOW_LIVE_MODE: 'true' })).not.toThrow();
  });

  it('blocks PSP_PROVIDER=stripe without ALLOW_LIVE_MODE', () => {
    expect(() => validateEnv({ ...base, PSP_PROVIDER: 'stripe' })).toThrow(/PSP_PROVIDER/);
  });

  it('allows PSP_PROVIDER=stripe when ALLOW_LIVE_MODE=true', () => {
    expect(() => validateEnv({ ...base, PSP_PROVIDER: 'stripe', ALLOW_LIVE_MODE: 'true' })).not.toThrow();
  });
});

describe('validateEnv — production hardening guards', () => {
  const prod = { ...base, NODE_ENV: 'production', ENCRYPTION_KEY: 'k'.repeat(20) };

  it('requires EMAIL_PROVIDER=smtp in production', () => {
    expect(() => validateEnv({ ...prod })).toThrow(/EMAIL_PROVIDER/);
    expect(() => validateEnv({ ...prod, EMAIL_PROVIDER: 'smtp' })).not.toThrow();
  });

  it('does not force smtp outside production', () => {
    expect(() => validateEnv({ ...base })).not.toThrow(); // console default is fine in dev
  });
});

describe('validateEnv — LIVE compliance guards', () => {
  const live = {
    ...base,
    NODE_ENV: 'production',
    ENCRYPTION_KEY: 'k'.repeat(20),
    EMAIL_PROVIDER: 'smtp',
    TRADING_MODE: 'LIVE',
    ALLOW_LIVE_MODE: 'true',
  };

  it('refuses LIVE with the simulation AML provider', () => {
    expect(() => validateEnv({ ...live, KYC_PROVIDER: 'external' })).toThrow(/AML_PROVIDER/);
  });

  it('refuses LIVE with manual KYC', () => {
    expect(() => validateEnv({ ...live, AML_PROVIDER: 'external' })).toThrow(/KYC_PROVIDER/);
  });

  it('refuses LIVE when the AML testing denylist is set', () => {
    expect(() =>
      validateEnv({ ...live, AML_PROVIDER: 'external', KYC_PROVIDER: 'external', AML_SIM_DENYLIST: 'Bad Actor' }),
    ).toThrow(/AML_SIM_DENYLIST/);
  });

  it('accepts LIVE with real compliance providers configured', () => {
    expect(() =>
      validateEnv({ ...live, AML_PROVIDER: 'external', KYC_PROVIDER: 'external' }),
    ).not.toThrow();
  });
});
