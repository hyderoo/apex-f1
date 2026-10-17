import { getCurrentDrivers, groupByTeam } from "@/lib/f1/drivers";
import { fetchConstructorStandings } from "@/lib/providers/jolpica";
import { SEASON_YEAR } from "@/lib/f1/season";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { hexToRgba } from "@/lib/utils/format";

export const metadata = { title: "Teams" };
export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const { drivers, demo } = await getCurrentDrivers();
  const teams = groupByTeam(drivers);
  const standings = await fetchConstructorStandings(SEASON_YEAR).catch(() => null);
  const standingBy = new Map(
    (standings?.data ?? []).map((s) => [s.name.toLowerCase(), s]),
  );
  return (
    <div>
      <PageHeader
        eyebrow="2026 Season"
        title="Teams"
        description="Constructor lineups as recorded at the latest completed race weekend."
        status={demo ? "demo" : "historical"}
      />
      <div className="grid grid-cols-1 gap-px bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-3">
        {teams.map((t) => {
          const st = standingBy.get(t.name.toLowerCase());
          return (
            <Link
              key={t.name}
              href={`/teams/${encodeURIComponent(t.name)}`}
              className="panel group p-4 hover:bg-[var(--surface-3)]"
            >
              <div className="flex items-center gap-3">
                <span className="h-10 w-1" style={{ background: hexToRgba(`#${t.colour.replace("#", "")}`) }} />
                <div>
                  <div className="text-base font-semibold">{t.name}</div>
                  <div className="text-[11px] text-[var(--ink-3)]">
                    {st ? `P${st.position} · ${st.points} pts` : "Standings unavailable"}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {t.drivers.map((d) => (
                  <div key={d.driverNumber} className="flex items-center justify-between text-sm">
                    <span>
                      {d.firstName} <span className="font-medium">{d.lastName}</span>
                    </span>
                    <span className="font-mono text-xs text-[var(--ink-3)] tnum">#{d.driverNumber}</span>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
