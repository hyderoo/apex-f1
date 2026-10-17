import { getCurrentDrivers } from "@/lib/f1/drivers";
import { fetchDriverStandings, fetchRaceResults } from "@/lib/providers/jolpica";
import { SEASON_YEAR } from "@/lib/f1/season";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { hexToRgba } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { DriverAvatar } from "@/components/identity/driver-identity";
import { CountryFlag } from "@/components/identity/country-flag";
import { DRIVER_NATIONALITY_2026 } from "@/lib/assets/manifest";

export const dynamic = "force-dynamic";

export default async function DriverPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;
  const num = Number(driverId);
  const { drivers, demo } = await getCurrentDrivers();
  const driver = drivers.find((d) => d.driverNumber === num);
  const [standingsEnv, resultsEnv] = await Promise.all([
    fetchDriverStandings(SEASON_YEAR).catch(() => null),
    fetchRaceResults(SEASON_YEAR).catch(() => null),
  ]);
  const standing = standingsEnv?.data.find(
    (s) => s.permanentNumber === num || s.driverId === driverId,
  );
  const results = (resultsEnv?.data ?? []).filter(
    (r) => r.driverNumber === num || r.driverId === driverId,
  );
  if (!driver && !standing) notFound();

  const name = driver?.fullName || `${standing?.givenName} ${standing?.familyName}`;
  const wins = results.filter((r) => r.position === 1).length;
  const podiums = results.filter((r) => r.position != null && r.position <= 3).length;
  const fastestLaps = results.filter((r) => r.fastestLap).length;

  return (
    <div>
      <PageHeader
        eyebrow={driver?.teamName ?? standing?.constructorIds.join(", ") ?? "Driver"}
        title={name}
        status={demo ? "demo" : "historical"}
      />
      <div className="grid grid-cols-1 gap-px bg-[var(--line)] lg:grid-cols-3">
        <section className="panel p-4">
          <div className="flex items-center gap-3">
            <span
              className="h-12 w-1"
              style={{ background: hexToRgba(`#${(driver?.teamColour ?? "8a8f98").replace("#", "")}`) }}
            />
            <div>
              <div className="font-mono text-3xl font-bold tnum">{driver?.driverNumber ?? standing?.permanentNumber}</div>
              <div className="text-xs text-[var(--ink-3)]">{driver?.acronym ?? standing?.code}</div>
            </div>
            <span className="ml-auto">
              <DriverAvatar
                src={driver?.headshotUrl}
                acronym={driver?.acronym ?? standing?.code ?? "?"}
                teamColour={driver?.teamColour}
                size={72}
              />
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-[var(--ink-3)]">
            <CountryFlag
              alpha3={driver?.countryCode ?? DRIVER_NATIONALITY_2026[driver?.driverNumber ?? standing?.permanentNumber ?? -1]}
              size={16}
              showName
            />
            {driver?.teamName && <span>· {driver.teamName}</span>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-px bg-[var(--line)]">
            {[
              ["Championship", standing ? `P${standing.position}` : "—"],
              ["Points", standing ? String(standing.points) : "—"],
              ["Wins (2026)", String(wins)],
              ["Podiums (2026)", String(podiums)],
              ["Fastest laps", String(fastestLaps)],
              ["Team", driver?.teamName ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="bg-[var(--surface-2)] p-3">
                <div className="micro-label">{k}</div>
                <div className="mt-1 font-mono text-sm tnum">{v}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel lg:col-span-2">
          <div className="border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">2026 race results</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--line)] text-left">
                <th className="micro-label px-3 py-1.5">Round</th>
                <th className="micro-label px-2 py-1.5 text-right">Grid</th>
                <th className="micro-label px-2 py-1.5 text-right">Finish</th>
                <th className="micro-label px-2 py-1.5 text-right">Pts</th>
                <th className="micro-label px-3 py-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.round} className="timing-row">
                  <td className="px-3 py-1.5 font-mono text-xs tnum">R{r.round}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs tnum">{r.grid ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs font-semibold tnum">
                    {r.positionText || "—"}
                    {r.fastestLap && <Badge tone="pb" className="ml-1">FL</Badge>}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs tnum">{r.points}</td>
                  <td className="px-3 py-1.5 text-xs text-[var(--ink-3)]">{r.status}</td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-[var(--ink-3)]">No results recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
