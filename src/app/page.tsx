import Link from "next/link";
import { getCalendar, sessionsByStatus } from "@/lib/f1/season";
import { TimingTower } from "@/components/timing/timing-tower";
import { WeatherPanel } from "@/components/dashboard/weather-panel";
import { RaceControlFeed } from "@/components/dashboard/race-control-feed";
import { SessionCountdown } from "@/components/dashboard/countdown";
import { StandingsPreview } from "@/components/dashboard/standings-preview";
import { DataStatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { CircuitHero } from "@/components/identity/circuit-hero";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { meetings, provenance } = await getCalendar();
  const allSessions = meetings.flatMap((m) => m.sessions);
  const { live, upcoming, finished } = sessionsByStatus(allSessions);
  const current = live[0] ?? null;
  const next = upcoming[0] ?? null;
  const lastRace = finished.filter((s) => s.type === "Race")[0] ?? finished[0] ?? null;
  const focus = current ?? lastRace;
  const featuredMeeting =
    meetings.find((m) => m.sessions.some((s) => s.sessionKey === (current ?? next)?.sessionKey)) ??
    meetings.find((m) => m.sessions.some((s) => s.sessionKey === lastRace?.sessionKey)) ??
    null;

  const totalRounds = meetings.filter((m) => m.name !== "Pre-Season Testing").length;
  const doneRounds = meetings.filter(
    (m) => m.name !== "Pre-Season Testing" && m.sessions.every((s) => s.status === "finished"),
  ).length;

  return (
    <div>
      <PageHeader
        eyebrow={`${new Date().getFullYear()} · Season dashboard`}
        title="APEX F1"
        description="Every Lap. Every Detail. Live. Real timing, telemetry and race data from OpenF1 and the Jolpica results API — clearly labelled by freshness."
        status={provenance.status}
        updatedAt={provenance.retrievedAt}
      />

      {featuredMeeting && (
        <CircuitHero
          eyebrow={current ? "Live now" : next ? "Next Grand Prix" : "Latest Grand Prix"}
          name={featuredMeeting.name}
          circuitShortName={featuredMeeting.circuitShortName}
          location={featuredMeeting.location}
          countryName={featuredMeeting.countryName}
          countryFlagUrl={featuredMeeting.countryFlagUrl}
          circuitImageUrl={featuredMeeting.circuitImageUrl}
          href={`/calendar/${featuredMeeting.meetingKey}`}
          cta={current ? "Open live timing" : "Event details"}
        />
      )}

      <div className="grid grid-cols-1 gap-px bg-[var(--line)] lg:grid-cols-3">
        {/* Session status */}
        <section className="panel lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">Session status</span>
            {current && <DataStatusBadge status="live" />}
          </div>
          <div className="px-4 py-4">
            {current ? (
              <div>
                <div className="text-lg font-semibold">
                  {current.countryName} — {current.name}
                </div>
                <p className="mt-1 text-xs text-[var(--ink-3)]">
                  In progress now. Timing below refreshes from the provider; without a live
                  OpenF1 subscription it is marked DELAYED.
                </p>
              </div>
            ) : next ? (
              <SessionCountdown session={next} />
            ) : (
              <p className="text-sm text-[var(--ink-3)]">Season complete — no upcoming sessions.</p>
            )}
            {lastRace && !current && (
              <p className="mt-4 border-t border-[var(--line)] pt-3 text-xs text-[var(--ink-3)]">
                Latest completed:{" "}
                <Link href={`/live?session=${lastRace.sessionKey}`} className="text-[var(--accent)] hover:underline">
                  {lastRace.location} {lastRace.name}
                </Link>{" "}
                ({lastRace.dateStart.slice(0, 10)}) — historical timing shown below.
              </p>
            )}
          </div>
          {/* Season progress */}
          <div className="border-t border-[var(--line)] px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="micro-label">Season progress</span>
              <span className="font-mono text-xs tnum">{doneRounds}/{totalRounds} rounds</span>
            </div>
            <div className="mt-2 h-1 w-full bg-[var(--surface-3)]">
              <div
                className="h-1 bg-[var(--accent)]"
                style={{ width: totalRounds ? `${(doneRounds / totalRounds) * 100}%` : "0%" }}
              />
            </div>
          </div>
        </section>

        {/* Weather */}
        <section className="panel">
          <div className="border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">
              Track conditions{focus ? ` · ${focus.circuitShortName}` : ""}
            </span>
          </div>
          <WeatherPanel sessionKey={focus?.sessionKey} />
        </section>

        {/* Timing tower */}
        <section className="panel lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">
              Timing tower{focus ? ` · ${focus.location} ${focus.name}` : ""}
            </span>
            <Link href="/live" className="text-[11px] text-[var(--accent)] hover:underline">
              Open live timing →
            </Link>
          </div>
          <TimingTower sessionKey={focus?.sessionKey} />
        </section>

        {/* Right rail */}
        <div className="flex flex-col gap-px bg-[var(--line)]">
          <section className="panel flex-1">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
              <span className="micro-label">Race control</span>
              <span className="text-[10px] text-[var(--ink-3)]">official feed</span>
            </div>
            <RaceControlFeed sessionKey={focus?.sessionKey} limit={6} />
          </section>
          <section className="panel">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
              <span className="micro-label">Championship</span>
              <Link href="/standings" className="text-[11px] text-[var(--accent)] hover:underline">
                Full standings →
              </Link>
            </div>
            <StandingsPreview />
          </section>
        </div>
      </div>
    </div>
  );
}
