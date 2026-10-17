import { getCurrentDrivers, groupByTeam } from "@/lib/f1/drivers";
import { fetchConstructorStandings, fetchRaceResults } from "@/lib/providers/jolpica";
import { SEASON_YEAR } from "@/lib/f1/season";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { hexToRgba } from "@/lib/utils/format";
import { TeamIdentity } from "@/components/identity/team-identity";
import { DriverAvatar } from "@/components/identity/driver-identity";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const name = decodeURIComponent(teamId);
  const { drivers, demo } = await getCurrentDrivers();
  const team = groupByTeam(drivers).find(
    (t) => t.name.toLowerCase() === name.toLowerCase(),
  );
  const [standingsEnv, resultsEnv] = await Promise.all([
    fetchConstructorStandings(SEASON_YEAR).catch(() => null),
    fetchRaceResults(SEASON_YEAR).catch(() => null),
  ]);
  const standing = standingsEnv?.data.find(
    (s) => s.name.toLowerCase() === name.toLowerCase(),
  );
  if (!team && !standing) notFound();
  const results = (resultsEnv?.data ?? []).filter(
    (r) => r.constructorName.toLowerCase() === name.toLowerCase(),
  );
  const byRound = new Map<number, typeof results>();
  for (const r of results) {
    const arr = byRound.get(r.round) ?? [];
    arr.push(r);
    byRound.set(r.round, arr);
  }
  return (
    <div>
      <PageHeader
        eyebrow="Constructor"
        title={team?.name ?? name}
        status={demo ? "demo" : "historical"}
      />
      <div className="grid grid-cols-1 gap-px bg-[var(--line)] lg:grid-cols-3">
        <section className="panel p-4">
          <div className="flex items-center gap-3">
            <span
              className="h-12 w-1"
              style={{ background: hexToRgba(`#${(team?.colour ?? "8a8f98").replace("#", "")}`) }}
            />
            <TeamIdentity name={team?.name ?? name} colour={team?.colour} size="featured" />
            <div>
              <div className="font-mono text-xl font-bold tnum">
                {standing ? `P${standing.position}` : "—"}
              </div>
              <div className="text-xs text-[var(--ink-3)]">
                {standing ? `${standing.points} pts · ${standing.wins} wins` : ""}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {(team?.drivers ?? []).map((d) => (
              <Link
                key={d.driverNumber}
                href={`/drivers/${d.driverNumber}`}
                className="flex items-center justify-between border border-[var(--line)] px-3 py-2 hover:bg-[var(--surface-3)]"
              >
                <span className="flex items-center gap-2 text-sm">
                  <DriverAvatar src={d.headshotUrl} acronym={d.acronym} teamColour={d.teamColour} size={24} />
                  {d.fullName}
                </span>
                <span className="font-mono text-xs text-[var(--ink-3)] tnum">#{d.driverNumber}</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="panel lg:col-span-2">
          <div className="border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">Race-by-race</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--line)] text-left">
                <th className="micro-label px-3 py-1.5">Round</th>
                <th className="micro-label px-2 py-1.5">Finishes</th>
                <th className="micro-label px-3 py-1.5 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {[...byRound.entries()].sort((a, b) => a[0] - b[0]).map(([round, rs]) => (
                <tr key={round} className="timing-row">
                  <td className="px-3 py-1.5 font-mono text-xs tnum">R{round}</td>
                  <td className="px-2 py-1.5 font-mono text-xs tnum">
                    {rs.map((r) => r.positionText || "—").join(" / ")}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-sm tnum">
                    {rs.reduce((s, r) => s + r.points, 0)}
                  </td>
                </tr>
              ))}
              {byRound.size === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-[var(--ink-3)]">No results recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
