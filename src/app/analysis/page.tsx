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
      {latest.length > 0 && (
        <section className="panel mb-px">
          <div className="border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">Race story · latest round</span>
          </div>
          <RaceStory results={latest} />
        </section>
      )}
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

interface RaceResultRow {
  position: number | null;
  positionText: string;
  points: number;
  givenName: string;
  familyName: string;
  constructorName: string;
  grid: number | null;
  status: string;
  time: string | null;
  fastestLap: boolean;
}

/** Narrative summary derived only from the recorded classification. */
function RaceStory({ results }: { results: RaceResultRow[] }) {
  const name = (r: RaceResultRow) => `${r.givenName} ${r.familyName}`;
  const classified = results.filter((r) => r.position != null);
  const winner = classified.find((r) => r.position === 1);
  const p2 = classified.find((r) => r.position === 2);
  const p3 = classified.find((r) => r.position === 3);
  const fl = results.find((r) => r.fastestLap);
  const isRunning = (r: RaceResultRow) => r.status === "Finished" || r.status === "Lapped" || r.status.startsWith("+");
  const finishers = results.filter(isRunning);
  const retirements = results.filter((r) => !isRunning(r));
  const movers = classified
    .filter((r) => r.grid != null && r.grid > 0)
    .map((r) => ({ r, gained: (r.grid as number) - (r.position as number) }));
  const gained = movers.filter((m) => m.gained > 0).sort((a, b) => b.gained - a.gained)[0];
  const lost = movers.filter((m) => m.gained < 0).sort((a, b) => a.gained - b.gained)[0];

  const sentences: string[] = [];
  if (winner) {
    let s = `${name(winner)} won the race for ${winner.constructorName}`;
    if (p2?.time) s += `, ${p2.time.replace(/^\+/, "")}s ahead of ${name(p2)}`;
    if (p3) s += `, with ${name(p3)} completing the podium`;
    sentences.push(s + ".");
  }
  if (fl) sentences.push(`${name(fl)} set the fastest lap.`);
  if (gained) sentences.push(`Biggest drive forward: ${name(gained.r)}, from P${gained.r.grid} to P${gained.r.position} (+${gained.gained} places).`);
  if (lost) sentences.push(`Toughest afternoon: ${name(lost.r)}, from P${lost.r.grid} to P${lost.r.position} (${lost.gained} places).`);
    if (retirements.length) {
      sentences.push(`${finishers.length} of ${results.length} drivers were classified at the flag; ${retirements.length} recorded as not finishing (${[...new Set(retirements.map((r) => r.status))].join(", ")}).`);
    } else {
      sentences.push(`All ${results.length} drivers were classified at the flag.`);
    }

  return (
    <div className="px-4 py-3">
      <div className="space-y-1.5 text-sm leading-relaxed text-[var(--ink-2)]">
        {sentences.map((sentence, i) => <p key={i}>{sentence}</p>)}
      </div>
      <p className="mt-3 text-[10px] leading-snug text-[var(--ink-3)]">
        Derived only from the recorded classification (Jolpica results API) —
        positions, grid slots, status and fastest-lap flag. No commentary or
        inferred events.
      </p>
    </div>
  );
}
