"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { ConstructorStanding, Driver, DriverStanding } from "@/lib/domain/types";
import { DriverAvatar } from "@/components/identity/driver-identity";
import { TeamIdentity } from "@/components/identity/team-identity";
import { TeamBadge } from "@/components/identity/team-badge";
import { teamBadge } from "@/lib/assets/team-badges";
import { usePrefs } from "@/components/preferences";
import { formatLocalTime } from "@/lib/utils/time";

interface NextRace { name: string; location: string; dateStart: string; gmtOffset: string; countdown: string | null }
interface CircuitRef { circuitKey: number; name: string; meetingKey: number }

/**
 * Personal hub for starred drivers and teams. Renders only real provider
 * data (standings, last race result, next race) — never estimates.
 */
export function FavoritesHub({
  drivers, driverStandings, constructorStandings, lastRace, lastRaceName, nextRace, circuits,
}: {
  drivers: Driver[];
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
  lastRace: Record<number, { positionText: string; status: string }>;
  lastRaceName: string | null;
  nextRace: NextRace | null;
  circuits: CircuitRef[];
}) {
  const { prefs, toggleFavorite } = usePrefs();
  const hasAny =
    prefs.favoriteDrivers.length + prefs.favoriteTeams.length + prefs.favoriteCircuits.length > 0;

  const standingOf = (n: number) => driverStandings.find((s) => s.permanentNumber === n) ?? null;
  const teamStandingOf = (name: string) => {
    const l = name.toLowerCase();
    return constructorStandings.find((s) => s.name.toLowerCase() === l)
      ?? constructorStandings.find((s) => s.name.toLowerCase().includes(l) || l.includes(s.name.toLowerCase()))
      ?? null;
  };

  return (
    <div>
      <div className="border-b border-[var(--line)] px-4 py-5 md:px-6">
        <div className="micro-label">Personal</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Favorites</h1>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          Saved locally in your browser. Sign in on the settings page to sync them to your account.
        </p>
      </div>
      <div className="space-y-6 px-4 py-4 md:px-6">
        {!hasAny && (
          <div className="panel panel-ticks p-8 text-center">
            <Star size={20} className="mx-auto text-[var(--ink-3)]" />
            <p className="mt-3 text-sm text-[var(--ink-2)]">No favorites yet.</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[var(--ink-3)]">
              Tap the star on any driver card on the <Link href="/drivers" className="underline hover:text-[var(--ink-2)]">Drivers</Link> page
              or on a team on the <Link href="/teams" className="underline hover:text-[var(--ink-2)]">Teams</Link> page.
              Your starred drivers and teams then show up here with their standings, latest result and quick links.
            </p>
          </div>
        )}

        {hasAny && nextRace && (
          <Link href="/calendar" className="panel group flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--surface-3)]">
            <div>
              <div className="micro-label">Next race</div>
              <div className="mt-0.5 text-sm font-semibold group-hover:text-[var(--accent)]">{nextRace.name}</div>
              <div className="text-[11px] text-[var(--ink-3)]">
                {formatLocalTime(nextRace.dateStart, nextRace.gmtOffset, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })} track
              </div>
            </div>
            {nextRace.countdown && (
              <div className="text-right">
                <div className="font-mono text-xl font-bold tnum">{nextRace.countdown}</div>
                <div className="micro-label">until lights out</div>
              </div>
            )}
          </Link>
        )}

        {prefs.favoriteDrivers.length > 0 && (
          <section>
            <div className="micro-label mb-2">Drivers</div>
            <div className="grid grid-cols-1 gap-px bg-[var(--line)] md:grid-cols-2">
              {prefs.favoriteDrivers.map((n) => {
                const d = drivers.find((x) => x.driverNumber === n);
                if (!d) return (
                  <div key={n} className="panel flex items-center justify-between px-4 py-3 text-sm text-[var(--ink-3)]">
                    Driver #{n} — not in the current-season lineup
                    <button onClick={() => toggleFavorite("driver", n)} aria-label="Remove" className="text-[var(--ink-3)] hover:text-[var(--accent)]">
                      <Star size={12} fill="currentColor" />
                    </button>
                  </div>
                );
                const st = standingOf(n);
                const lr = lastRace[n];
                return (
                  <div key={n} className="panel p-4">
                    <div className="flex items-start gap-3">
                      <DriverAvatar src={d.headshotUrl} acronym={d.acronym} teamColour={d.teamColour} size={48} />
                      <div className="min-w-0">
                        <Link href={`/drivers/${d.driverNumber}`} className="block truncate text-base font-semibold hover:text-[var(--accent)]">
                          {d.firstName} <span className="uppercase">{d.lastName}</span>
                        </Link>
                        <TeamIdentity name={d.teamName} colour={d.teamColour} size="standard" />
                      </div>
                      <button
                        onClick={() => toggleFavorite("driver", n)}
                        aria-label={`Remove ${d.fullName} from favorites`}
                        className="ml-auto text-[var(--accent)]"
                      >
                        <Star size={14} fill="currentColor" />
                      </button>
                    </div>
                    <div className="mt-3 flex gap-4 border-t border-[var(--line)] pt-2.5">
                      <div>
                        <div className="micro-label">Championship</div>
                        <div className="mt-0.5 font-mono text-sm tnum">
                          {st ? `P${st.position} · ${st.points} pts` : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="micro-label">Last race{lastRaceName ? ` · ${lastRaceName.replace(" Grand Prix", "")}` : ""}</div>
                        <div className="mt-0.5 font-mono text-sm tnum">
                          {lr ? (lr.positionText.startsWith("R") || lr.positionText.startsWith("D") || lr.positionText.startsWith("W") ? lr.status : `P${lr.positionText}`) : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                      <Link href={`/drivers/${d.driverNumber}`} className="text-[var(--ink-3)] underline hover:text-[var(--accent)]">Profile</Link>
                      <Link href={`/telemetry?d1=${d.driverNumber}`} className="text-[var(--ink-3)] underline hover:text-[var(--accent)]">Telemetry</Link>
                      <Link href="/radio" className="text-[var(--ink-3)] underline hover:text-[var(--accent)]">Team radio</Link>
                      <Link href="/analysis" className="text-[var(--ink-3)] underline hover:text-[var(--accent)]">Head-to-head</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {prefs.favoriteTeams.length > 0 && (
          <section>
            <div className="micro-label mb-2">Teams</div>
            <div className="grid grid-cols-1 gap-px bg-[var(--line)] md:grid-cols-2">
              {prefs.favoriteTeams.map((t) => {
                const members = drivers.filter((d) => d.teamName === t);
                const st = teamStandingOf(t);
                return (
                  <div key={t} className="panel p-4">
                    <div className="flex items-start gap-3">
                      {(() => {
                        const b = teamBadge(t);
                        const mark = <TeamIdentity name={t} colour={members[0]?.teamColour} size="compact" />;
                        return b ? <TeamBadge url={b.url} name={t} px={40}>{mark}</TeamBadge> : mark;
                      })()}
                      <div className="min-w-0">
                        <Link href={`/teams/${encodeURIComponent(t)}`} className="block truncate text-base font-semibold hover:text-[var(--accent)]">{t}</Link>
                        <div className="mt-0.5 text-[11px] text-[var(--ink-3)]">
                          {members.map((m) => `${m.firstName} ${m.lastName}`).join(" · ") || "Lineup unavailable"}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFavorite("team", t)}
                        aria-label={`Remove ${t} from favorites`}
                        className="ml-auto text-[var(--accent)]"
                      >
                        <Star size={14} fill="currentColor" />
                      </button>
                    </div>
                    <div className="mt-3 border-t border-[var(--line)] pt-2.5">
                      <div className="micro-label">Constructors</div>
                      <div className="mt-0.5 font-mono text-sm tnum">{st ? `P${st.position} · ${st.points} pts` : "—"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {prefs.favoriteCircuits.length > 0 && (
          <section>
            <div className="micro-label mb-2">Circuits</div>
            <div className="flex flex-wrap gap-2">
              {prefs.favoriteCircuits.map((k) => {
                const c = circuits.find((x) => x.circuitKey === k);
                return (
                  <span key={k} className="panel flex items-center gap-2 px-3 py-1.5 text-sm">
                    {c ? (
                      <Link href={`/calendar/${c.meetingKey}`} className="hover:text-[var(--accent)]">{c.name}</Link>
                    ) : (
                      <span className="text-[var(--ink-3)]">Circuit #{k}</span>
                    )}
                    <button onClick={() => toggleFavorite("circuit", k)} aria-label="Remove" className="text-[var(--ink-3)] hover:text-[var(--accent)]">
                      <Star size={12} fill="currentColor" />
                    </button>
                  </span>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
