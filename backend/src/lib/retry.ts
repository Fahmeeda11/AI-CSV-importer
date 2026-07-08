export interface RetryOptions {
  /** Total attempts including the first. */
  attempts?: number;
  /** Base delay in ms; grows exponentially with jitter. */
  baseDelayMs?: number;
  /** Ceiling for a single backoff delay. */
  maxDelayMs?: number;
  /** Called before each retry (not before the first attempt). */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  /** Return false to stop retrying a given error immediately. */
  shouldRetry?: (error: unknown) => boolean;
  /** Injectable sleep, primarily for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Retry an async operation with exponential backoff + full jitter.
 * Used to make AI batch calls resilient to transient failures / rate limits.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    attempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 8000,
    onRetry,
    shouldRetry = () => true,
    sleep = defaultSleep,
  } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !shouldRetry(error)) break;

      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      // Full jitter: random within [0, backoff].
      const delayMs = Math.round(Math.random() * backoff);
      onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }
  throw lastError;
}
