import { fetchRaceResults, fetchQualifyingResults } from "@/lib/providers/jolpica";
import { SEASON_YEAR } from "@/lib/f1/season";
import { PageHeader } from "@/components/layout/page-header";
import { PointsProgression } from "@/components/charts/points-progression";
import { Badge } from "@/components/ui/badge";
import { OfflineNote } from "@/components/pwa/offline-note";
import { TeamIdentity } from "@/components/identity/team-identity";
import { ShareCardButton } from "@/components/ui/share-card-button";
import { DragScroll } from "@/components/ui/drag-scroll";

export const metadata = { title: "Race Analysis" };
export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const [results, qualifying] = await Promise.all([
    fetchRaceResults(SEASON_YEAR).catch(() => null),
    fetchQualifyingResults(SEASON_YEAR).catch(() => null),
  ]);
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
      <div className="px-4 pt-4 md:px-6"><OfflineNote /></div>
      {latest.length > 0 && (
        <section className="panel mb-px">
          <div className="border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">Race story · latest round</span>
          </div>
          <RaceStory results={latest} />
        </section>
      )}
      <section className="panel mb-px">
        <div className="border-b border-[var(--line)] px-4 py-2.5">
          <span className="micro-label">Teammate head-to-head · season to date</span>
        </div>
        <TeammateH2H results={results?.data ?? []} qualifying={qualifying?.data ?? []} />
      </section>
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

interface H2HRaceRow { round: number; position: number | null; driverId: string; constructorId: string; constructorName: string; status: string; givenName: string; familyName: string }
interface H2HQualiRow { round: number; position: number | null; driverId: string; constructorId: string }

/**
 * Teammate head-to-head across the season from recorded classifications
 * only: lower qualifying position wins the quali duel; in the race the
 * classified finisher ahead wins, and rounds where a car is not classified
 * still count if exactly one teammate is classified. Rounds with only one
 * car entered, or neither classified, are excluded from the score.
 */
function TeammateH2H({ results, qualifying }: { results: H2HRaceRow[]; qualifying: H2HQualiRow[] }) {
  const rounds = [...new Set(results.map((r) => r.round))].sort((a, b) => a - b);
  const teams = new Map<string, { name: string; drivers: Map<string, { q: number; r: number }> }>();
  const cell = (cid: string, cname: string, did: string) => {
    if (!teams.has(cid)) teams.set(cid, { name: cname, drivers: new Map() });
    const t = teams.get(cid)!;
    if (!t.drivers.has(did)) t.drivers.set(did, { q: 0, r: 0 });
    return t.drivers.get(did)!;
  };

  for (const round of rounds) {
    const raceRows = results.filter((r) => r.round === round);
    const qualiRows = qualifying.filter((q) => q.round === round);
    const constructors = [...new Set(raceRows.map((r) => r.constructorId))];
    for (const cid of constructors) {
      const cname = raceRows.find((r) => r.constructorId === cid)?.constructorName ?? cid;
      const pair = raceRows.filter((r) => r.constructorId === cid);
      if (pair.length !== 2) continue; // one car entered this round — no duel
      const [a, b] = pair;
      // race duel: exactly one classified, or both classified and different positions
      if (a.position != null && b.position != null && a.position !== b.position) {
        cell(cid, cname, a.position < b.position ? a.driverId : b.driverId).r++;
      } else if ((a.position == null) !== (b.position == null)) {
        cell(cid, cname, (a.position != null ? a : b).driverId).r++;
      }
      // quali duel: both have a position and they differ
      const qa = qualiRows.find((q) => q.constructorId === cid && q.driverId === a.driverId);
      const qb = qualiRows.find((q) => q.constructorId === cid && q.driverId === b.driverId);
      if (qa?.position != null && qb?.position != null && qa.position !== qb.position) {
        cell(cid, cname, qa.position < qb.position ? a.driverId : b.driverId).q++;
      } else {
        // ensure both drivers appear even without a duel result
        cell(cid, cname, a.driverId); cell(cid, cname, b.driverId);
      }
    }
  }

  const nameOf = (did: string) => {
    const r = results.find((x) => x.driverId === did);
    return r ? r.familyName : did;
  };
  const rows = [...teams.entries()].map(([cid, t]) => ({
    cid, name: t.name,
    drivers: [...t.drivers.entries()].sort((a, b) => (b[1].q + b[1].r) - (a[1].q + a[1].r)),
  })).filter((t) => t.drivers.length === 2);

  if (rows.length === 0) {
    return <div className="px-4 py-6 text-center text-xs text-[var(--ink-3)]">No head-to-head data available yet.</div>;
  }

  return (
    <DragScroll>
      <table className="w-full min-w-[560px]">
        <thead>
          <tr className="border-b border-[var(--line)] text-left">
            <th className="px-4 py-2 micro-label font-normal">Team</th>
            <th className="px-2 py-2 micro-label font-normal">Qualifying</th>
            <th className="px-2 py-2 micro-label font-normal">Race</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const [[da, sa], [db, sb]] = t.drivers;
            return (
              <tr key={t.cid} className="timing-row">
                <td className="px-4 py-1.5 text-sm"><TeamIdentity name={t.name} size="standard" /></td>
                <td className="px-2 py-1.5 font-mono text-xs tnum">
                  <span className="font-semibold">{nameOf(da)} {sa.q}</span>
                  <span className="text-[var(--ink-3)]"> — {sb.q} {nameOf(db)}</span>
                </td>
                <td className="px-2 py-1.5 font-mono text-xs tnum">
                  <span className="font-semibold">{nameOf(da)} {sa.r}</span>
                  <span className="text-[var(--ink-3)]"> — {sb.r} {nameOf(db)}</span>
                </td>
                <td className="px-2 py-1.5 text-right">
                  <ShareCardButton a={nameOf(da)} b={nameOf(db)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-[var(--line)] px-4 py-2 text-[10px] leading-snug text-[var(--ink-3)]">
        Recorded classifications only (Jolpica), Grands Prix. Qualifying duel: lower
        recorded position. Race duel: classified finisher ahead; a round with exactly
        one classified car counts for that car; rounds with one car entered or neither
        car classified are excluded.
      </p>
    </DragScroll>
  );
}
