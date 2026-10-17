import { NextResponse } from "next/server";
import { fetchConstructorStandings, fetchDriverStandings } from "@/lib/providers/jolpica";
import { SEASON_YEAR } from "@/lib/f1/season";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [drivers, constructors] = await Promise.all([
      fetchDriverStandings(SEASON_YEAR),
      fetchConstructorStandings(SEASON_YEAR),
    ]);
    return NextResponse.json(
      { drivers: drivers.data, constructors: constructors.data, provenance: drivers.provenance },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "standings unavailable", detail: err instanceof Error ? err.message : "" },
      { status: 502 },
    );
  }
}
