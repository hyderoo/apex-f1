import { cache } from "react";
import type { Driver, Team } from "@/lib/domain/types";
import { withDemoFallback } from "@/lib/providers";
import { getSessions } from "./season";

/** Drivers of the most recent finished session (current-season lineup). */
export const getCurrentDrivers = cache(async (): Promise<{ drivers: Driver[]; sessionKey: number | null; demo: boolean }> => {
  const sessionsEnv = await getSessions();
  const sessions = sessionsEnv.data ?? [];
  const finished = sessions
    .filter((s) => s.status === "finished" && s.type === "Race")
    .sort((a, b) => b.dateStart.localeCompare(a.dateStart));
  const key = finished[0]?.sessionKey ?? null;
  if (key == null) return { drivers: [], sessionKey: null, demo: false };
  const { envelope, fellBack } = await withDemoFallback((p) => p.drivers({ sessionKey: key }));
  return { drivers: envelope.data ?? [], sessionKey: key, demo: fellBack };
});

export function groupByTeam(drivers: Driver[]): Team[] {
  const map = new Map<string, Team>();
  for (const d of drivers) {
    const t = map.get(d.teamName) ?? { name: d.teamName, colour: d.teamColour, drivers: [] };
    t.drivers.push(d);
    map.set(d.teamName, t);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
