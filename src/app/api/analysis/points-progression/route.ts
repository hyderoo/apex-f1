import { NextResponse } from "next/server";
import { fetchRaceResults } from "@/lib/providers/jolpica";
import { SEASON_YEAR } from "@/lib/f1/season";

export const dynamic = "force-dynamic";

/** Cumulative points per round for the top 8 drivers (by current total). */
export async function GET() {
  try {
    const env = await fetchRaceResults(SEASON_YEAR);
    const rounds = [...new Set(env.data.map((r) => r.round))].sort((a, b) => a - b);
    const totals = new Map<string, number>();
    const codes = new Map<string, string>();
    for (const r of env.data) {
      totals.set(r.driverId, (totals.get(r.driverId) ?? 0) + r.points);
      codes.set(r.driverId, r.code ?? r.familyName.slice(0, 3).toUpperCase());
    }
    const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
    const series = top.map((id) => {
      let acc = 0;
      const points = rounds.map((round) => {
        acc += env.data
          .filter((r) => r.driverId === id && r.round === round)
          .reduce((s, r) => s + r.points, 0);
        return acc;
      });
      return { driverId: id, code: codes.get(id) ?? id, points };
    });
    return NextResponse.json(
      { rounds, series },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "progression unavailable", detail: err instanceof Error ? err.message : "" },
      { status: 502 },
    );
  }
}
