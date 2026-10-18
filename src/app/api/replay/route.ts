import { NextRequest, NextResponse } from "next/server";
import { openF1 } from "@/lib/providers";
import { resolveSession } from "@/lib/f1/session-data";
import {
  REPLAY_MAX_DRIVERS, replayT0, toReplayPoints, type ReplayDriverTrack,
} from "@/lib/f1/replay";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Downsampled location tracks for the race replay. Raw OpenF1 location data
 * is ~35k points (~4.5 MB) per driver per race — unusable as-is — so this
 * route fetches server-side (rate-limited, retries, immutable data cached by
 * Next for a day) and returns compact [t, x, y] samples, ~2000 per driver.
 *
 * No demo fallback: replay is only honest with the session's own recorded
 * data, so a provider failure surfaces as an explicit error, not demo laps.
 *
 * GET /api/replay?session=<key>&drivers=4,1,16 (drivers optional; defaults
 * to the session's classified top 5 by position).
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("session");
  const session = await resolveSession(key ? Number(key) : null);
  if (!session) return NextResponse.json({ error: "no session" }, { status: 404 });

  let driverNumbers: number[] = [];
  const driversParam = req.nextUrl.searchParams.get("drivers");
  if (driversParam) {
    driverNumbers = driversParam.split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0 && n < 100);
  } else {
    // Default: classified top 5 (fall back to the entry list if the session
    // has no classification, e.g. practice).
    try {
      const result = await openF1.sessionResult({ sessionKey: session.sessionKey });
      driverNumbers = (result.data ?? [])
        .filter((r) => r.position != null)
        .sort((a, b) => (a.position! - b.position!))
        .slice(0, 5)
        .map((r) => r.driverNumber);
    } catch { /* fall through to drivers list */ }
    if (driverNumbers.length === 0) {
      try {
        const drivers = await openF1.drivers({ sessionKey: session.sessionKey });
        driverNumbers = (drivers.data ?? []).slice(0, 5).map((d) => d.driverNumber);
      } catch { /* handled below */ }
    }
  }
  driverNumbers = [...new Set(driverNumbers)].slice(0, REPLAY_MAX_DRIVERS);
  if (driverNumbers.length === 0) {
    return NextResponse.json({ error: "no drivers available for this session" }, { status: 404 });
  }

  // Bound the query to the session window (with padding for formation and
  // cool-down laps): OpenF1 sometimes has stray location points hours or
  // days outside the session, which would stretch the replay clock.
  const padStart = new Date(new Date(session.dateStart).getTime() - 30 * 60000).toISOString();
  const padEnd = new Date(new Date(session.dateEnd).getTime() + 15 * 60000).toISOString();

  // Sequential with the shared rate limiter: each driver is one OpenF1
  // request, and Vercel egress IPs are shared, so bursts are what get 429s.
  const raw: { driverNumber: number; points: import("@/lib/domain/types").LocationPoint[] }[] = [];
  const failures: number[] = [];
  for (const dn of driverNumbers) {
    try {
      const env = await openF1.locations({
        sessionKey: session.sessionKey, driverNumber: dn, dateStart: padStart, dateEnd: padEnd,
      });
      if ((env.data ?? []).length > 0) raw.push({ driverNumber: dn, points: env.data! });
      else failures.push(dn);
    } catch {
      failures.push(dn);
    }
  }
  if (raw.length === 0) {
    return NextResponse.json(
      { error: "no location data recorded for this session", drivers: failures },
      { status: 404 },
    );
  }

  const t0 = replayT0(raw);
  const tracks: ReplayDriverTrack[] = raw.map((r) => ({
    driverNumber: r.driverNumber, points: toReplayPoints(r.points, t0),
  }));

  // Driver metadata for labels/colours and the picker. Non-fatal if the
  // provider call fails — tracks still carry driverNumber.
  let drivers: { driverNumber: number; acronym: string; fullName: string; teamColour: string | null }[] = [];
  try {
    const env = await openF1.drivers({ sessionKey: session.sessionKey });
    drivers = (env.data ?? []).map((d) => ({
      driverNumber: d.driverNumber, acronym: d.acronym, fullName: d.fullName,
      teamColour: d.teamColour || null,
    }));
  } catch { /* labels fall back to car numbers */ }

  return NextResponse.json(
    {
      session,
      t0: new Date(t0).toISOString(),
      tracks,
      drivers,
      unavailableDrivers: failures,
      note: "Downsampled from recorded OpenF1 location data (~4 Hz raw). Positions are interpolated between samples; gaps in a driver's recording mean the car is hidden, not guessed.",
    },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
