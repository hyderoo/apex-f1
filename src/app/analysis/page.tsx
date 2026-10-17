import { fetchRaceResults } from "@/lib/providers/jolpica";
import { SEASON_YEAR } from "@/lib/f1/season";
import { PageHeader } from "@/components/layout/page-header";
import { PointsProgression } from "@/components/charts/points-progression";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Race Analysis" };
export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const results = await fetchRaceResults(SEASON_YEAR).catch(() => null);
  const rounds = [...new Set((results?.data ?? []).map((r) => r.round))].sort((a, b) => b - a);
  const latestRound = rounds[0];
  const latest = (results?.data ?? [])
    .filter((r) => r.round === latestRound)
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
  return (
    <div>
      <PageHeader
        eyebrow={`${SEASON_YEAR} Season`}
        title="Race Analysis"
        description="Points progression and round results from the Jolpica results API. Classifications may be provisional until officially confirmed."
        status={results?.provenance.status ?? "unavailable"}
      />
      <div className="grid grid-cols-1 gap-px bg-[var(--line)] xl:grid-cols-2">
        <section className="panel">
          <div className="border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">Championship progression (top 8)</span>
          </div>
          <PointsProgression />
        </section>
        <section className="panel">
          <div className="border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">Latest round results{latestRound ? ` · R${latestRound}` : ""}</span>
          </div>
          <table className="w-full">
            <tbody>
              {latest.map((r) => (
                <tr key={`${r.round}-${r.driverId}`} className="timing-row">
                  <td className="w-10 px-3 py-1.5 text-center font-mono text-xs text-[var(--ink-3)]">{r.positionText}</td>
                  <td className="px-2 py-1.5 text-sm">
                    {r.givenName} <span className="font-semibold">{r.familyName}</span>
                  </td>
                  <td className="px-2 py-1.5 text-xs text-[var(--ink-3)]">{r.constructorName}</td>
                  <td className="px-2 py-1.5 text-right">
                    {r.fastestLap && <Badge tone="pb">FL</Badge>}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-xs tnum">{r.points}</td>
                </tr>
              ))}
              {latest.length === 0 && (
                <tr><td className="px-4 py-6 text-center text-xs text-[var(--ink-3)]">No results available.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
