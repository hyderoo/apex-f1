import type {
  Driver, IntervalPoint, Lap, LeaderboardRow, PitStop, PositionPoint, Stint,
} from "@/lib/domain/types";

/**
 * Assemble a timing-tower leaderboard from provider data.
 * Position comes from the latest PositionPoint (never inferred from telemetry).
 * Pure function — unit tested.
 */
export function buildLeaderboard(input: {
  drivers: Driver[];
  laps: Lap[];
  intervals: IntervalPoint[];
  positions: PositionPoint[];
  stints: Stint[];
  pitStops: PitStop[];
}): LeaderboardRow[] {
  const { drivers, laps, intervals, positions, stints, pitStops } = input;

  const latestBy = <T extends { date: string | null }>(rows: T[]): Map<number, T> => {
    const m = new Map<number, T>();
    for (const r of rows as (T & { driverNumber: number })[]) {
      if (!r.date) continue;
      const prev = m.get((r as { driverNumber: number }).driverNumber);
      if (!prev || (prev.date ?? "") < r.date) m.set((r as { driverNumber: number }).driverNumber, r);
    }
    return m;
  };

  const latestInterval = latestBy(intervals);
  const latestPosition = latestBy(positions);

  const lapsByDriver = new Map<number, Lap[]>();
  for (const l of laps) {
    const arr = lapsByDriver.get(l.driverNumber) ?? [];
    arr.push(l);
    lapsByDriver.set(l.driverNumber, arr);
  }
  const stintsByDriver = new Map<number, Stint[]>();
  for (const s of stints) {
    const arr = stintsByDriver.get(s.driverNumber) ?? [];
    arr.push(s);
    stintsByDriver.set(s.driverNumber, arr);
  }
  const pitsByDriver = new Map<number, PitStop[]>();
  for (const p of pitStops) {
    const arr = pitsByDriver.get(p.driverNumber) ?? [];
    arr.push(p);
    pitsByDriver.set(p.driverNumber, arr);
  }

  // Session-best sectors across all drivers
  const bestSectors: [number, number, number] = [Infinity, Infinity, Infinity];
  for (const l of laps) {
    const sectors = [l.durationSector1, l.durationSector2, l.durationSector3];
    sectors.forEach((s, i) => {
      if (s != null && s > 0 && s < bestSectors[i]) bestSectors[i] = s;
    });
  }

  const rows: LeaderboardRow[] = drivers.map((d) => {
    const dn = d.driverNumber;
    const dLaps = (lapsByDriver.get(dn) ?? [])
      .filter((l) => l.lapDuration != null || l.durationSector1 != null)
      .sort((a, b) => a.lapNumber - b.lapNumber);
    const last = dLaps[dLaps.length - 1];
    const timed = dLaps.filter((l) => l.lapDuration != null && l.lapDuration > 0);
    const best = timed.reduce<Lap | null>(
      (acc, l) => (acc == null || (l.lapDuration ?? Infinity) < (acc.lapDuration ?? Infinity) ? l : acc),
      null,
    );

    // personal best sectors
    const pb: [number, number, number] = [Infinity, Infinity, Infinity];
    for (const l of dLaps) {
      const sectors = [l.durationSector1, l.durationSector2, l.durationSector3];
      sectors.forEach((s, i) => {
        if (s != null && s > 0 && s < pb[i]) pb[i] = s;
      });
    }

    const stintList = (stintsByDriver.get(dn) ?? []).sort((a, b) => a.stintNumber - b.stintNumber);
    const currentLap = last?.lapNumber ?? 0;
    const currentStint =
      stintList.filter((s) => currentLap >= s.lapStart && currentLap <= s.lapEnd).pop() ??
      stintList[stintList.length - 1];
    const pits = pitsByDriver.get(dn) ?? [];
    const latestPit = pits[pits.length - 1];

    const lastSectorVals = [last?.durationSector1, last?.durationSector2, last?.durationSector3];
    const personalBestSectors = lastSectorVals.map(
      (s, i) => s != null && pb[i] !== Infinity && Math.abs(s - pb[i]) < 1e-9,
    ) as [boolean, boolean, boolean];
    const sessionBestSectors = lastSectorVals.map(
      (s, i) => s != null && bestSectors[i] !== Infinity && Math.abs(s - bestSectors[i]) < 1e-9,
    ) as [boolean, boolean, boolean];

    const pos = latestPosition.get(dn);
    const intv = latestInterval.get(dn);

    // retired: has a position at some point but no new lap for a long time
    // (cannot know without live timing; approximate: no lap recorded and session produced laps)
    const retired = false;

    return {
      position: pos?.position ?? null,
      driverNumber: dn,
      acronym: d.acronym,
      fullName: d.fullName,
      teamName: d.teamName,
      teamColour: d.teamColour,
      lastLap: last?.lapDuration ?? null,
      bestLap: best?.lapDuration ?? null,
      sector1: last?.durationSector1 ?? null,
      sector2: last?.durationSector2 ?? null,
      sector3: last?.durationSector3 ?? null,
      gapToLeader: intv?.gapToLeader ?? null,
      interval: intv?.interval ?? null,
      compound: currentStint?.compound ?? null,
      tyreAge:
        currentStint != null && currentLap > 0
          ? currentStint.tyreAgeAtStart + Math.max(0, currentLap - currentStint.lapStart)
          : null,
      pitStops: pits.length,
      speedTrap: last?.stSpeed ?? null,
      lapNumber: last?.lapNumber ?? null,
      inPit: latestPit != null && latestPit.lapNumber === currentLap && latestPit.pitDuration == null,
      retired,
      personalBestSectors,
      sessionBestSectors,
    };
  });

  rows.sort((a, b) => {
    if (a.position == null && b.position == null) return a.driverNumber - b.driverNumber;
    if (a.position == null) return 1;
    if (b.position == null) return -1;
    return a.position - b.position;
  });
  return rows;
}
