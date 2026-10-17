/** HTTP helpers: timeout, retry with exponential backoff + jitter, rate limiting. */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public url: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class RateLimiter {
  private timestamps: number[] = [];
  constructor(
    private maxRequests: number,
    private perMs: number,
  ) {}
  async acquire(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter((t) => now - t < this.perMs);
      if (this.timestamps.length < this.maxRequests) {
        this.timestamps.push(now);
        return;
      }
      const wait = this.perMs - (now - this.timestamps[0]) + 5;
      await sleep(wait);
    }
  }
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface FetchJsonOptions {
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
  rateLimiter?: RateLimiter;
  /** Next.js fetch cache hints */
  revalidate?: number | false;
  headers?: Record<string, string>;
}

export async function fetchJson<T = unknown>(
  url: string,
  opts: FetchJsonOptions = {},
): Promise<T> {
  const {
    timeoutMs = 15_000,
    retries = 2,
    baseDelayMs = 400,
    rateLimiter,
    revalidate,
    headers,
  } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const jitter = Math.random() * baseDelayMs;
      await sleep(baseDelayMs * 2 ** (attempt - 1) + jitter);
    }
    if (rateLimiter) await rateLimiter.acquire();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { accept: "application/json", ...headers },
        ...(revalidate !== undefined
          ? { next: { revalidate } }
          : { cache: "no-store" }),
      });
      if (res.status === 429 || res.status >= 500) {
        throw new HttpError(res.status, `HTTP ${res.status}`, url);
      }
      if (!res.ok) {
        throw new HttpError(res.status, `HTTP ${res.status}`, url);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      const retryable =
        err instanceof HttpError
          ? err.status === 429 || err.status >= 500
          : true; // network/abort errors
      if (!retryable || attempt === retries) break;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

/** Tiny in-memory cache for API routes (per serverless instance). */
export class MemoryCache<T> {
  private store = new Map<string, { value: T; expires: number }>();
  constructor(private defaultTtlMs: number) {}
  get(key: string): { value: T; ageMs: number } | null {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expires) {
      this.store.delete(key);
      return null;
    }
    return { value: hit.value, ageMs: Date.now() - (hit.expires - this.defaultTtlMs) };
  }
  set(key: string, value: T, ttlMs?: number) {
    this.store.set(key, {
      value,
      expires: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }
}
