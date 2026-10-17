import { NextResponse } from "next/server";
import { getMeetings, getSessions } from "@/lib/f1/season";
import { openF1LiveConfigured, supabaseConfigured } from "@/lib/env";
import { fetchDriverStandings } from "@/lib/providers/jolpica";

export const dynamic = "force-dynamic";

/** Data freshness / provider health monitor. */
export async function GET() {
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
  return NextResponse.json({
    now: new Date().toISOString(),
    config: {
      openF1LiveKey: openF1LiveConfigured(),
      supabase: supabaseConfigured(),
    },
    providers: checks,
  });
}
