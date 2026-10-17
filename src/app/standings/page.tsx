import { fetchConstructorStandings, fetchDriverStandings } from "@/lib/providers/jolpica";
import { getCurrentDrivers } from "@/lib/f1/drivers";
import { CountryFlag } from "@/components/identity/country-flag";
import { TeamIdentity } from "@/components/identity/team-identity";
import { DRIVER_NATIONALITY_2026 } from "@/lib/assets/manifest";
import { SEASON_YEAR } from "@/lib/f1/season";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty";
import { PointsProgression } from "@/components/charts/points-progression";

export const metadata = { title: "Standings" };
export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  let drivers = null, constructors = null, provenance = null;
  try {
    [drivers, constructors] = await Promise.all([
      fetchDriverStandings(SEASON_YEAR),
      fetchConstructorStandings(SEASON_YEAR),
    ]);
    provenance = drivers.provenance;
  } catch {
    /* fall through to empty state */
  }
  // Team colours come from OpenF1 driver metadata; match Jolpica constructor
  // names fuzzily (e.g. "Red Bull" vs "Red Bull Racing").
  const { drivers: currentDrivers } = await getCurrentDrivers().catch(() => ({ drivers: [] }));
  const colourFor = (name: string): string | null => {
    const n = name.toLowerCase();
    const hit = currentDrivers.find((d) => {
      const t = d.teamName.toLowerCase();
      return t === n || t.includes(n) || n.includes(t);
    });
    return hit?.teamColour ?? null;
  };
  const constructorNameById = new Map(
    (constructors?.data ?? []).map((c) => [c.constructorId, c.name]),
  );
  return (
    <div>
      <PageHeader
        eyebrow={`${SEASON_YEAR} Championship`}
        title="Standings"
        description="Official-style championship tables from the Jolpica results API. Classifications may be provisional until the FIA publishes final results."
        status={provenance?.status ?? "unavailable"}
        updatedAt={provenance?.retrievedAt}
      />
      {!drivers || drivers.data.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="Standings not available"
            body="The standings provider could not be reached. Try again later."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-[var(--line)] xl:grid-cols-2">
          <section className="panel">
            <div className="border-b border-[var(--line)] px-4 py-2.5">
              <span className="micro-label">Drivers</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--line)] text-left">
                  <th className="micro-label w-10 px-3 py-1.5">P</th>
                  <th className="micro-label px-2 py-1.5">Driver</th>
                  <th className="micro-label px-2 py-1.5">Constructor</th>
                  <th className="micro-label px-2 py-1.5 text-right">Wins</th>
                  <th className="micro-label px-3 py-1.5 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {drivers.data.map((d) => (
                  <tr key={d.driverId} className="timing-row">
                    <td className="px-3 py-1.5 text-center font-mono text-xs text-[var(--ink-3)]">{d.position}</td>
                    <td className="px-2 py-1.5 text-sm">
                      <a href={`/drivers/${d.permanentNumber ?? d.driverId}`} className="inline-flex items-center gap-2 hover:text-[var(--accent)]">
                        <CountryFlag alpha3={DRIVER_NATIONALITY_2026[d.permanentNumber ?? -1]} size={14} />
                        <span>
                          {d.givenName} <span className="font-semibold">{d.familyName}</span>
                        </span>
                      </a>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-[var(--ink-3)]">
                      {d.constructorIds.map((id) => {
                        const nm = constructorNameById.get(id) ?? id;
                        return (
                          <span key={id} className="mr-2 inline-flex items-center gap-1.5 align-middle">
                            <TeamIdentity name={nm} colour={colourFor(nm)} size="compact" />
                            <span>{nm}</span>
                          </span>
                        );
                      })}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-xs tnum">{d.wins}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-sm font-semibold tnum">{d.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="panel">
            <div className="border-b border-[var(--line)] px-4 py-2.5">
              <span className="micro-label">Constructors</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--line)] text-left">
                  <th className="micro-label w-10 px-3 py-1.5">P</th>
                  <th className="micro-label px-2 py-1.5">Team</th>
                  <th className="micro-label px-2 py-1.5 text-right">Wins</th>
                  <th className="micro-label px-3 py-1.5 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {(constructors?.data ?? []).map((c) => (
                  <tr key={c.constructorId} className="timing-row">
                    <td className="px-3 py-1.5 text-center font-mono text-xs text-[var(--ink-3)]">{c.position}</td>
                    <td className="px-2 py-1.5 text-sm font-medium">
                      <a href={`/teams/${encodeURIComponent(c.name)}`} className="hover:text-[var(--accent)]">
                        <TeamIdentity name={c.name} colour={colourFor(c.name)} size="standard" className="font-medium" />
                      </a>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-xs tnum">{c.wins}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-sm font-semibold tnum">{c.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="panel xl:col-span-2">
            <div className="border-b border-[var(--line)] px-4 py-2.5">
              <span className="micro-label">Points progression</span>
            </div>
            <PointsProgression />
          </section>
        </div>
      )}
    </div>
  );
}
