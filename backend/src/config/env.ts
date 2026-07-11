import "dotenv/config";
import { z } from "zod";

/**
 * Environment configuration, validated once at startup.
 *
 * `OPENAI_API_KEY` is intentionally optional so the server can boot (and serve
 * `/health`) without a key. Requests that need the AI fail with a clear,
 * actionable error instead of crashing the process.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  OPENAI_API_KEY: z.string().trim().optional(),
  OPENAI_MODEL: z.string().trim().default("gpt-4o-mini"),
  /** Rows per AI batch. */
  BATCH_SIZE: z.coerce.number().int().positive().max(200).default(20),
  /** Max upload size in megabytes. */
  MAX_FILE_MB: z.coerce.number().positive().max(50).default(5),
  /** Comma-separated allowed CORS origins, or "*" for any. */
  ALLOWED_ORIGIN: z.string().trim().default("*"),
  /** Max concurrent AI batch requests in flight. */
  AI_CONCURRENCY: z.coerce.number().int().positive().max(20).default(4),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast with a readable message on genuine misconfiguration.
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

/** Whether the AI provider is configured and usable. */
export const isAiConfigured = (): boolean => Boolean(env.OPENAI_API_KEY);

/** Parsed list of allowed CORS origins ("*" or blank means allow any). */
export const allowedOrigins: "*" | string[] = (() => {
  const raw = env.ALLOWED_ORIGIN.trim();
  if (raw === "" || raw === "*") return "*";
  const list = raw.split(",").map((o) => o.trim()).filter(Boolean);
  return list.length > 0 ? list : "*";
})();
