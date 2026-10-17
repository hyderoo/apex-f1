import { NextResponse } from "next/server";
import { getMeetings, getSessions } from "@/lib/f1/season";
import { withDemoFallback } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [meetingsEnv, sessionsEnv] = await Promise.all([getMeetings(), getSessions()]);
    const meetings = meetingsEnv.data ?? [];
    const sessions = sessionsEnv.data ?? [];
    const finished = sessions
      .filter((s) => s.status === "finished" && (s.type === "Race" || s.type === "Qualifying"))
      .sort((a, b) => b.dateStart.localeCompare(a.dateStart));
    let drivers: { driverNumber: number; fullName: string; acronym: string; teamName: string }[] = [];
    if (finished[0]) {
      const { envelope } = await withDemoFallback((p) => p.drivers({ sessionKey: finished[0].sessionKey }));
      drivers = envelope.data ?? [];
    }
    const teams = [...new Map(drivers.map((d) => [d.teamName, d])).values()];
    const items = [
      ...drivers.map((d) => ({
        kind: "driver", id: String(d.driverNumber), label: d.fullName,
        sub: d.teamName, href: `/drivers/${d.driverNumber}`,
      })),
      ...teams.map((t) => ({
        kind: "team", id: t.teamName, label: t.teamName, sub: "Team",
        href: `/teams/${encodeURIComponent(t.teamName)}`,
      })),
      ...meetings.filter((m) => m.name !== "Pre-Season Testing").map((m) => ({
        kind: "meeting", id: String(m.meetingKey), label: m.name,
        sub: `${m.countryName} · ${m.circuitShortName}`, href: `/calendar/${m.meetingKey}`,
      })),
      ...sessions
        .filter((s) => s.type === "Race")
        .map((s) => ({
          kind: "session", id: String(s.sessionKey),
          label: `${s.location} — ${s.name}`, sub: s.dateStart.slice(0, 10),
          href: `/live?session=${s.sessionKey}`,
        })),
    ];
    return NextResponse.json(items, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "search index unavailable", detail: err instanceof Error ? err.message : "" },
      { status: 502 },
    );
  }
}
