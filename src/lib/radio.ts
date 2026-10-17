import type { Driver, TeamRadioClip } from "@/lib/domain/types";

export interface RadioClipView extends TeamRadioClip {
  acronym: string;
  teamName: string;
  teamColour: string;
}

/** Join clips to drivers and sort chronologically. */
export function buildClipList(clips: TeamRadioClip[], drivers: Driver[]): RadioClipView[] {
  const byNumber = new Map(drivers.map((d) => [d.driverNumber, d]));
  return clips
    .map((c) => {
      const d = byNumber.get(c.driverNumber);
      return {
        ...c,
        acronym: d?.acronym ?? `#${c.driverNumber}`,
        teamName: d?.teamName ?? "Unknown team",
        teamColour: (d?.teamColour ?? "8a8f98").replace("#", ""),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Distinct team names present in a driver list, alphabetically. */
export function teamOptions(drivers: Driver[]): string[] {
  return [...new Set(drivers.map((d) => d.teamName))].sort();
}
