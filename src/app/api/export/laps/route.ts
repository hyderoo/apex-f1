import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/f1/session-data";
import { withDemoFallback } from "@/lib/providers";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV export of recorded lap data (provider-permitted data only). */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("session");
  const session = await resolveSession(key ? Number(key) : null);
  if (!session) return NextResponse.json({ error: "no session" }, { status: 404 });
  const { envelope } = await withDemoFallback((p) => p.laps({ sessionKey: session.sessionKey }));
  const rows = envelope.data ?? [];
  const header = "driver_number,lap_number,date_start,lap_duration,sector1,sector2,sector3,i1_speed,i2_speed,st_speed,is_pit_out_lap";
  const body = rows.map((l) =>
    [l.driverNumber, l.lapNumber, l.dateStart, l.lapDuration, l.durationSector1,
     l.durationSector2, l.durationSector3, l.i1Speed, l.i2Speed, l.stSpeed, l.isPitOutLap]
      .map(csvCell).join(","),
  );
  const csv = [header, ...body].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="apex-f1-laps-${session.sessionKey}.csv"`,
      "X-Data-Source": envelope.provenance.provider,
    },
  });
}
