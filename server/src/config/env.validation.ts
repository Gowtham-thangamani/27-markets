import { z } from 'zod';

/**
 * Strongly-typed, validated environment. The app refuses to boot on invalid
 * config — better a hard failure at startup than a money bug at runtime.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    // May be a single origin or a comma-separated list (localhost + LAN IP, etc.)
    CLIENT_ORIGIN: z.string().min(1).default('http://localhost:5173'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be >= 32 chars'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be >= 32 chars'),
    ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL: z.coerce.number().int().positive().default(604800),

    TOTP_ISSUER: z.string().default('Apex Markets'),

    // ── Market data (Finnhub real-time) ──
    // Optional: when unset, live market endpoints serve cached/empty and the
    // upstream WebSocket is not opened (app still boots normally).
    FINNHUB_API_KEY: z.string().optional(),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    MARKET_SYMBOLS: z
      .string()
      .default(
        'BINANCE:BTCUSDT,BINANCE:ETHUSDT,BINANCE:SOLUSDT,BINANCE:XRPUSDT,' +
          'OANDA:EUR_USD,OANDA:GBP_USD,OANDA:USD_JPY,OANDA:AUD_USD,' +
          'OANDA:XAU_USD,OANDA:XAG_USD,AAPL,TSLA,NVDA,AMZN',
      ),

    // ── Payments (PSP) ──
    // Which payment provider backs funding. 'simulation' (default) moves no real
    // money; 'stripe' enables the Stripe adapter (requires keys + LIVE gating).
    PSP_PROVIDER: z.enum(['simulation', 'stripe']).default('simulation'),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    TRADING_MODE: z.enum(['SIMULATION', 'LIVE']).default('SIMULATION'),
    ALLOW_LIVE_MODE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .superRefine((env, ctx) => {
    // Hard safety rail: LIVE mode is impossible without an explicit override,
    // which must not exist until licensing + custody/LP/PSP/KYC are in place.
    if (env.TRADING_MODE === 'LIVE' && !env.ALLOW_LIVE_MODE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'TRADING_MODE=LIVE is blocked. Real funds must not move until the platform ' +
          'is licensed and custody/LP/PSP/KYC partners are integrated. Set ALLOW_LIVE_MODE=true ' +
          'only when that is true and you accept full regulatory responsibility.',
      });
    }
    if (
      env.NODE_ENV === 'production' &&
      env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT access and refresh secrets must differ in production.',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
