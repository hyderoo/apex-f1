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

export interface RadioDriverGroup {
  driverNumber: number;
  acronym: string;
  fullName: string;
  teamName: string;
  teamColour: string;
  clips: RadioClipView[];
}

/** Group clips by driver, preserving each driver's chronological clip order. */
export function groupClipsByDriver(clips: RadioClipView[], drivers: Driver[]): RadioDriverGroup[] {
  const byNumber = new Map(drivers.map((d) => [d.driverNumber, d]));
  const groups = new Map<number, RadioDriverGroup>();
  for (const c of clips) {
    let g = groups.get(c.driverNumber);
    if (!g) {
      const d = byNumber.get(c.driverNumber);
      g = {
        driverNumber: c.driverNumber,
        acronym: c.acronym,
        fullName: d?.fullName ?? c.acronym,
        teamName: c.teamName,
        teamColour: c.teamColour,
        clips: [],
      };
      groups.set(c.driverNumber, g);
    }
    g.clips.push(c);
  }
  // Team alphabetical, then driver acronym, for a stable wall-of-teams order.
  return [...groups.values()].sort(
    (a, b) => a.teamName.localeCompare(b.teamName) || a.acronym.localeCompare(b.acronym),
  );
}
