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
