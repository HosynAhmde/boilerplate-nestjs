import { z } from 'zod';

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');
/** An optional variable where `FOO=` (empty) in .env counts as unset. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

/**
 * All environment variables the API reads. The app refuses to start when any
 * of them is missing or malformed, so misconfiguration fails loudly at boot.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DB_LOGGING: bool.default(false),

  /** Overrides the log level picked from NODE_ENV (debug in dev, info in prod). */
  LOG_LEVEL: optional(z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])),
  /** When set, GET /metrics requires `Authorization: Bearer <token>`. */
  METRICS_TOKEN: optional(z.string().min(16)),

  REDIS_URL: z.url({ protocol: /^rediss?$/ }),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  AUTH_HASH_PEPPER: z.string().min(32),
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(5),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().nonnegative().default(60),
  OTP_DEV_LOG: bool.default(false),

  SMS_PROVIDER: z.enum(['console']).default('console'),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER: z.string().optional(),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().min(1).default('./storage'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('default'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: bool.default(true),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  if (result.data.NODE_ENV === 'production' && result.data.OTP_DEV_LOG) {
    throw new Error('OTP_DEV_LOG must be false in production');
  }
  if (result.data.STORAGE_DRIVER === 's3') {
    const missing = (
      ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const
    ).filter((k) => !result.data[k]);
    if (missing.length) throw new Error(`STORAGE_DRIVER=s3 needs: ${missing.join(', ')}`);
  }
  return result.data;
}

/** Loads the repo-root .env (if present) into process.env for CLI scripts. */
export function loadDotEnv(): void {
  for (const path of ['.env', '../../.env']) {
    try {
      process.loadEnvFile(path);
      return;
    } catch {
      // file not found: try the next location
    }
  }
}
