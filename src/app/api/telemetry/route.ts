import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/f1/session-data";
import { withDemoFallback, openF1 } from "@/lib/providers";
import { lapWindow, buildDistanceSeries, joinTelemetry, downsample, lapDelta, deriveMetrics } from "@/lib/telemetry/lap";
import { DEMO_SESSION_KEY, DEMO_TELEMETRY_DRIVERS } from "@/lib/providers/demo";
import type { Envelope } from "@/lib/domain/types";
import type { F1DataProvider } from "@/lib/providers/types";

/**
 * Demo fallback is only honest for the session the snapshot actually
 * contains (2026 Singapore GP). For any other session, a provider failure
 * must surface as UNAVAILABLE — never as empty data wearing a demo label.
 */
async function telemetryEnvelope<T>(
  sessionKey: number,
  fn: (p: F1DataProvider) => Promise<Envelope<T>>,
): Promise<{ envelope: Envelope<T>; fellBack: boolean; error?: string }> {
  if (sessionKey === DEMO_SESSION_KEY) return withDemoFallback(fn);
  try {
    return { envelope: await fn(openF1), fellBack: false };
  } catch (err) {
    return {
      envelope: {
        data: null as T,
        provenance: {
          provider: "OpenF1",
          status: "unavailable",
          observedAt: null,
          retrievedAt: new Date().toISOString(),
          staleAfterMs: 0,
        },
      },
      fellBack: false,
      error: err instanceof Error ? `${err.message} ${(err as { url?: string }).url ?? ""}`.trim() : String(err),
    };
  }
}

export const dynamic = "force-dynamic";

/**
 * Telemetry for one lap, one or two drivers (comma-separated driver numbers).
 * Response is downsampled for charting. Distance is derived from recorded
 * location points (approximation, documented in lib/telemetry/lap.ts).
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const sessionKey = Number(p.get("session"));
  const lapNumber = Number(p.get("lap"));
  const driverNumbers = (p.get("drivers") ?? "")
    .split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)).slice(0, 2);
  if (!sessionKey || !lapNumber || driverNumbers.length === 0) {
    return NextResponse.json({ error: "session, lap and drivers are required" }, { status: 400 });
  }
  const session = await resolveSession(sessionKey);
  if (!session) return NextResponse.json({ error: "unknown session" }, { status: 404 });

  const out: Record<number, unknown> = {};
  let provenance = null as null | object;
  let providerError: string | null = null;
  for (const dn of driverNumbers) {
    const lapsRes = await telemetryEnvelope(sessionKey, (p2) => p2.laps({ sessionKey, driverNumber: dn }));
    if (lapsRes.envelope.provenance.status === "unavailable") {
      providerError = lapsRes.error ?? "provider error";
      out[dn] = { error: "unavailable", points: [], trackOutline: [], metrics: null };
      continue;
    }
    const laps = lapsRes.envelope.data ?? [];
    const win = lapWindow(laps, lapNumber);
    if (!win) {
      out[dn] = { error: "lap not found or has no recorded start time" };
      continue;
    }
    const [car, loc] = await Promise.all([
      telemetryEnvelope(sessionKey, (p2) => p2.carData({ sessionKey, driverNumber: dn, dateStart: win.start, dateEnd: win.end })),
      telemetryEnvelope(sessionKey, (p2) => p2.locations({ sessionKey, driverNumber: dn, dateStart: win.start, dateEnd: win.end })),
    ]);
    if (car.envelope.provenance.status === "unavailable" || loc.envelope.provenance.status === "unavailable") {
      providerError = car.error ?? loc.error ?? "provider error";
      out[dn] = { error: "unavailable", points: [], trackOutline: [], metrics: null };
      continue;
    }
    const demoNote =
      lapsRes.fellBack && !DEMO_TELEMETRY_DRIVERS.includes(dn)
        ? "Demo snapshot only contains telemetry for drivers 3 and 16."
        : null;
    const series = buildDistanceSeries(loc.envelope.data ?? [], win);
    const joined = joinTelemetry(car.envelope.data ?? [], series, win);
    const sampled = downsample(joined, 400);
    provenance = car.envelope.provenance;
    out[dn] = {
      window: win,
      points: sampled,
      metrics: deriveMetrics(joined),
      trackOutline: downsample(series, 500),
      lapTime: laps.find((l) => l.lapNumber === lapNumber)?.lapDuration ?? null,
      sectors: (() => {
        const lap = laps.find((l) => l.lapNumber === lapNumber);
        return lap ? [lap.durationSector1, lap.durationSector2, lap.durationSector3] : null;
      })(),
      demoNote,
    };
  }
  if (!provenance && providerError) {
    provenance = {
      provider: "OpenF1",
      status: "unavailable",
      observedAt: null,
      retrievedAt: new Date().toISOString(),
      staleAfterMs: 0,
    };
  }

  // delta when two drivers requested
  let delta: { distance: number; delta: number }[] = [];
  if (driverNumbers.length === 2) {
    const a = out[driverNumbers[0]] as { points?: { distance: number | null; t: number }[] };
    const b = out[driverNumbers[1]] as { points?: { distance: number | null; t: number }[] };
    if (a?.points && b?.points) {
      delta = lapDelta(
        a.points as never,
        b.points as never,
      );
    }
  }

  return NextResponse.json({ session, drivers: out, delta, provenance, providerError });
}
