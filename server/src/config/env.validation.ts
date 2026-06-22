import { z } from 'zod';

/**
 * Strongly-typed, validated environment. The app refuses to boot on invalid
 * config — better a hard failure at startup than a money bug at runtime.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be >= 32 chars'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be >= 32 chars'),
    ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL: z.coerce.number().int().positive().default(604800),

    TOTP_ISSUER: z.string().default('Apex Markets'),

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
