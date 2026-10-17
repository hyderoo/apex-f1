import { getCurrentDrivers } from "@/lib/f1/drivers";
import { getCalendar, SEASON_YEAR } from "@/lib/f1/season";
import { fetchConstructorStandings, fetchDriverStandings, fetchRaceResults } from "@/lib/providers/jolpica";
import { FavoritesHub } from "@/components/favorites/favorites-hub";
import type { MeetingWithSessions } from "@/lib/f1/season";

export const metadata = { title: "Favorites" };
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const [{ drivers }, driverStandingsEnv, constructorStandingsEnv, { meetings }, resultsEnv] =
    await Promise.all([
      getCurrentDrivers(),
      fetchDriverStandings(SEASON_YEAR).catch(() => null),
      fetchConstructorStandings(SEASON_YEAR).catch(() => null),
      getCalendar(),
      fetchRaceResults(SEASON_YEAR).catch(() => null),
    ]);

  const results = resultsEnv?.data ?? [];
  const latestRound = results.reduce((max, r) => Math.max(max, r.round), 0);
  const lastRace = new Map<number, { positionText: string; status: string }>();
  for (const r of results.filter((x) => x.round === latestRound)) {
    if (r.driverNumber != null) lastRace.set(r.driverNumber, { positionText: r.positionText, status: r.status });
  }
  const lastRaceMeeting = meetings
    .filter((m) => m.sessions.some((s) => s.type === "Race" && s.status === "finished"))
    .sort((a, b) => b.dateEnd.localeCompare(a.dateEnd))[0];

  const now = new Date().toISOString();
  const nextMeeting: MeetingWithSessions | undefined = meetings.find((m) => {
    const race = m.sessions.find((s) => s.type === "Race");
    return race != null && race.dateStart > now;
  });

  return (
    <FavoritesHub
      drivers={drivers}
      driverStandings={driverStandingsEnv?.data ?? []}
      constructorStandings={constructorStandingsEnv?.data ?? []}
      lastRace={Object.fromEntries(lastRace)}
      lastRaceName={lastRaceMeeting?.name ?? null}
      nextRace={(() => {
        if (!nextMeeting) return null;
        const race = nextMeeting.sessions.find((s) => s.type === "Race")!;
        const ms = new Date(race.dateStart).getTime() - Date.now();
        const days = Math.floor(ms / 86_400_000);
        const hours = Math.floor((ms % 86_400_000) / 3_600_000);
        return {
          name: nextMeeting.name,
          location: nextMeeting.location,
          dateStart: race.dateStart,
          gmtOffset: nextMeeting.gmtOffset,
          countdown: ms > 0 ? (days > 0 ? `${days}d ${hours}h` : `${hours}h`) : null,
        };
      })()}
      circuits={meetings.map((m) => ({ circuitKey: m.circuitKey, name: m.circuitShortName, meetingKey: m.meetingKey }))}
    />
  );
}
