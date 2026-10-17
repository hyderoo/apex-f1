import { getMeetings, getSessions } from "@/lib/f1/season";
import { openF1LiveConfigured, supabaseConfigured } from "@/lib/env";
import { fetchDriverStandings } from "@/lib/providers/jolpica";

/** Real probes against a tiny recorded window (Singapore 2026, lap 1). */
async function probeTelemetry() {
  const url =
    "https://api.openf1.org/v1/car_data?session_key=11388&driver_number=3&date%3E=2026-10-11T12:05:00&date%3C=2026-10-11T12:05:10";
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 300 },
    });
    const ms = Date.now() - t0;
    const body = res.ok ? ((await res.json()) as unknown[]) : null;
    return {
      ok: res.ok,
      httpStatus: res.status,
      responseMs: ms,
      samples: Array.isArray(body) ? body.length : 0,
      rateLimited: res.status === 429,
    };
  } catch (err) {
    return { ok: false, responseMs: Date.now() - t0, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Data freshness / provider health monitor. Every value is a real check. */
export async function collectHealth() {
  const checks: Record<string, unknown> = {};
  let t0 = Date.now();
  try {
    const m = await getMeetings();
    checks.openf1 = {
      ok: true, responseMs: Date.now() - t0,
      status: m.provenance.status, provider: m.provenance.provider,
      retrievedAt: m.provenance.retrievedAt,
      meetings: m.data?.length ?? 0,
    };
  } catch (err) {
    checks.openf1 = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  t0 = Date.now();
  try {
    const s = await fetchDriverStandings(2026);
    checks.jolpica = { ok: true, responseMs: Date.now() - t0, standings: s.data.length };
  } catch (err) {
    checks.jolpica = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  try {
    const s = await getSessions();
    checks.sessions = { count: s.data?.length ?? 0 };
  } catch { /* reported via openf1 */ }
  checks.telemetryProbe = await probeTelemetry();
  return {
    now: new Date().toISOString(),
    config: {
      openF1LiveKey: openF1LiveConfigured(),
      supabase: supabaseConfigured(),
      supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      cronSecret: Boolean(process.env.CRON_SECRET),
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
    },
    deploy: {
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      commitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      platform: process.env.VERCEL ? "vercel" : "self-hosted",
    },
    providers: checks,
  };
}
