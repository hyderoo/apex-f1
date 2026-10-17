import type { Envelope, LeaderboardRow, Session } from "@/lib/domain/types";
import { withDemoFallback, delayedIfNoLive } from "@/lib/providers";
import { buildLeaderboard } from "./leaderboard";
import { getSessions } from "./season";
import { openF1LiveConfigured } from "@/lib/env";

/** Resolve a session: explicit key, else current live, else latest finished. */
export async function resolveSession(sessionKey?: number | null): Promise<Session | null> {
  const env = await getSessions();
  const sessions = env.data ?? [];
  if (sessionKey != null) return sessions.find((s) => s.sessionKey === sessionKey) ?? null;
  const live = sessions.find((s) => s.status === "live");
  if (live) return live;
  const finished = sessions
    .filter((s) => s.status === "finished" && s.type === "Race")
    .sort((a, b) => b.dateStart.localeCompare(a.dateStart));
  return finished[0] ?? null;
}

export async function getLeaderboard(session: Session): Promise<Envelope<LeaderboardRow[]>> {
  const sessionKey = session.sessionKey;
  const [drivers, laps, intervals, positions, stints, pits] = await Promise.all([
    withDemoFallback((p) => p.drivers({ sessionKey })),
    withDemoFallback((p) => p.laps({ sessionKey })),
    withDemoFallback((p) => p.intervals({ sessionKey })),
    withDemoFallback((p) => p.positions({ sessionKey })),
    withDemoFallback((p) => p.stints({ sessionKey })),
    withDemoFallback((p) => p.pitStops({ sessionKey })),
  ]);
  const fellBack = [drivers, laps, intervals, positions, stints, pits].some((r) => r.fellBack);
  const rows = buildLeaderboard({
    drivers: drivers.envelope.data ?? [],
    laps: laps.envelope.data ?? [],
    intervals: intervals.envelope.data ?? [],
    positions: positions.envelope.data ?? [],
    stints: stints.envelope.data ?? [],
    pitStops: pits.envelope.data ?? [],
  });
  let env: Envelope<LeaderboardRow[]> = {
    data: rows,
    provenance: laps.envelope.provenance,
  };
  if (!fellBack && session.status === "live") {
    env = delayedIfNoLive(env, openF1LiveConfigured());
  }
  return env;
}
