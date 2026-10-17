/**
 * Shared helpers for live API contract tests.
 * These hit the real providers — they belong in the contract suite
 * (vitest.contract.config.ts), never in the offline unit suite.
 */

export type FieldType = "string" | "number" | "boolean";

export type FieldSpec = { type: FieldType; nullable?: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sequential fetch with backoff on 429/5xx — providers rate-limit shared IPs. */
export async function fetchJson(url: string, attempts = 4): Promise<unknown> {
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, { headers: { "user-agent": "apex-f1-contract-tests" } }).catch((e) => {
      lastErr = e;
      return null;
    });
    if (res && res.ok) return res.json();
    if (res) lastErr = new Error(`HTTP ${res.status} for ${url}`);
    if (res && res.status !== 429 && res && res.status < 500) break;
    await sleep(3000 * (i + 1));
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * OpenF1 answers "no data" with 404 (or 200) + {"detail":"No results found."}.
 * Mirrors src/lib/providers/openf1: both mean empty, not failure.
 * Returns [] for empty, so shape checks run only when rows exist.
 */
export async function fetchJsonAllowEmpty(url: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(url, { headers: { "user-agent": "apex-f1-contract-tests" } });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const body = await res.json();
  if (body && typeof body === "object" && "detail" in (body as Record<string, unknown>)) return [];
  return body as Record<string, unknown>[];
}

/** Polite spacing between live calls. */
export const pace = () => sleep(600);

/**
 * Assert that every field the app reads is present on a live payload row,
 * with the expected primitive type (or null when marked nullable).
 * Extra keys are fine — contract tests fail when providers REMOVE or
 * RETYPE what we consume, not when they add data.
 */
export function assertRowShape(endpoint: string, row: unknown, fields: Record<string, FieldSpec>): void {
  if (typeof row !== "object" || row === null) {
    throw new Error(`${endpoint}: expected an object row, got ${typeof row}`);
  }
  const rec = row as Record<string, unknown>;
  const problems: string[] = [];
  for (const [key, spec] of Object.entries(fields)) {
    if (!(key in rec)) {
      problems.push(`missing key "${key}"`);
      continue;
    }
    const v = rec[key];
    if (v === null) {
      if (!spec.nullable) problems.push(`"${key}" is null (not declared nullable)`);
      continue;
    }
    const t = Array.isArray(v) ? "array" : typeof v;
    if (t !== spec.type) problems.push(`"${key}" is ${t}, expected ${spec.type}`);
  }
  if (problems.length) {
    throw new Error(`${endpoint} schema drift:\n  - ${problems.join("\n  - ")}\nRow: ${JSON.stringify(rec).slice(0, 400)}`);
  }
}
