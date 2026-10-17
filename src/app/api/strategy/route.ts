import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/f1/session-data";
import { withDemoFallback } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("session");
  const session = await resolveSession(key ? Number(key) : null);
  if (!session) return NextResponse.json({ error: "no session" }, { status: 404 });
  const sk = session.sessionKey;
  const [drivers, stints, pits, laps, weather] = await Promise.all([
    withDemoFallback((p) => p.drivers({ sessionKey: sk })),
    withDemoFallback((p) => p.stints({ sessionKey: sk })),
    withDemoFallback((p) => p.pitStops({ sessionKey: sk })),
    withDemoFallback((p) => p.laps({ sessionKey: sk })),
    withDemoFallback((p) => p.weather({ sessionKey: sk })),
  ]);
  const fellBack = stints.fellBack;
  return NextResponse.json({
    session,
    drivers: drivers.envelope.data ?? [],
    stints: stints.envelope.data ?? [],
    pitStops: pits.envelope.data ?? [],
    laps: (laps.envelope.data ?? []).map((l) => ({
      driverNumber: l.driverNumber,
      lapNumber: l.lapNumber,
      dateStart: l.dateStart,
      lapDuration: l.lapDuration,
      isPitOutLap: l.isPitOutLap,
    })),
    weather: (weather.envelope.data ?? []).map((w) => ({
      date: w.date,
      airTemperature: w.airTemperature,
      trackTemperature: w.trackTemperature,
    })),
    lapCount: Math.max(0, ...(laps.envelope.data ?? []).map((l) => l.lapNumber)),
    provenance: {
      ...stints.envelope.provenance,
      status: fellBack ? "demo" : "historical",
    },
  });
}
