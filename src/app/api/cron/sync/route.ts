import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { getMeetings, getSessions } from "@/lib/f1/season";
import { fetchDriverStandings, fetchConstructorStandings } from "@/lib/providers/jolpica";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled ingestion (Vercel Cron: see vercel.json). Protected by CRON_SECRET.
 * Syncs schedule/session metadata and standings into Supabase. Historical
 * backfill instructions are in the README.
 */
export async function GET(req: NextRequest) {
  const { CRON_SECRET } = getServerEnv();
  const auth = req.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sb = getSupabaseServiceRole();
  if (!sb) {
    return NextResponse.json(
      { error: "supabase not configured", detail: "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  const started = new Date().toISOString();
  const detail: Record<string, unknown> = {};
  let status: "ok" | "error" | "partial" = "ok";

  try {
    const { data: meetings } = await getMeetings();
    const { data: sessions } = await getSessions();

    await sb.from("seasons").upsert({ year: 2026 });

    const circuits = new Map<number, Record<string, unknown>>();
    for (const m of meetings ?? []) {
      circuits.set(m.circuitKey, {
        circuit_key: m.circuitKey, short_name: m.circuitShortName,
        type: m.circuitType, location: m.location, country_code: m.countryCode,
        country_name: m.countryName, country_flag_url: m.countryFlagUrl,
        image_url: m.circuitImageUrl, info_url: m.circuitInfoUrl,
        gmt_offset: m.gmtOffset, updated_at: new Date().toISOString(),
      });
    }
    const { error: cErr } = await sb.from("circuits").upsert([...circuits.values()]);
    if (cErr) throw new Error(`circuits: ${cErr.message}`);

    const { error: mErr } = await sb.from("meetings").upsert(
      (meetings ?? []).map((m) => ({
        meeting_key: m.meetingKey, year: m.year, circuit_key: m.circuitKey,
        name: m.name, official_name: m.officialName, location: m.location,
        country_name: m.countryName, country_code: m.countryCode,
        date_start: m.dateStart, date_end: m.dateEnd, gmt_offset: m.gmtOffset,
        is_cancelled: m.isCancelled, updated_at: new Date().toISOString(),
      })),
    );
    if (mErr) throw new Error(`meetings: ${mErr.message}`);

    const { error: sErr } = await sb.from("sessions").upsert(
      (sessions ?? []).map((s) => ({
        session_key: s.sessionKey, meeting_key: s.meetingKey, name: s.name,
        type: s.type, date_start: s.dateStart || null, date_end: s.dateEnd || null,
        gmt_offset: s.gmtOffset, circuit_key: s.circuitKey,
        is_cancelled: s.isCancelled, updated_at: new Date().toISOString(),
      })),
    );
    if (sErr) throw new Error(`sessions: ${sErr.message}`);
    detail.meetings = meetings?.length ?? 0;
    detail.sessions = sessions?.length ?? 0;
  } catch (err) {
    status = "partial";
    detail.scheduleError = err instanceof Error ? err.message : String(err);
  }

  try {
    const [ds, cs] = await Promise.all([fetchDriverStandings(2026), fetchConstructorStandings(2026)]);
    const rows = [
      ...ds.data.map((d) => ({
        year: 2026, kind: "driver", entity_id: d.driverId,
        position: d.position, points: d.points, wins: d.wins,
        updated_at: new Date().toISOString(),
      })),
      ...cs.data.map((c) => ({
        year: 2026, kind: "constructor", entity_id: c.constructorId,
        position: c.position, points: c.points, wins: c.wins,
        updated_at: new Date().toISOString(),
      })),
    ];
    const { error } = await sb.from("championship_standings").upsert(rows);
    if (error) throw new Error(error.message);
    detail.standings = rows.length;
  } catch (err) {
    status = "partial";
    detail.standingsError = err instanceof Error ? err.message : String(err);
  }

  await sb.from("data_sync_runs").insert({
    job: "cron-sync", status, started_at: started,
    finished_at: new Date().toISOString(), detail,
  });

  return NextResponse.json({ status, detail });
}
