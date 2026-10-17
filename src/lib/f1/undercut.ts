/**
 * Pit stop + undercut analyzer math.
 *
 * Everything here is derived from real recorded lap durations and pit
 * records (OpenF1 laps + pit endpoints) — no simulated or assumed times.
 * Method: cumulative race time per driver at the end of each lap (sum of
 * recorded lap durations; pit-lane time is already inside the pit lap's
 * duration). The delta between two drivers around a pit window shows
 * exactly what the stop gained or lost.
 *
 * Honest limits, also stated on the UI panel:
 * - Traffic, safety car / VSC and flags are not modelled; the delta is a
 *   stopwatch comparison, not a simulation.
 * - Missing lap durations (DNF laps, red flags) are skipped, so a delta
 *   can span unequal lap counts mid-race — we only compare laps both
 *   drivers completed.
 */

export interface LapSample {
  driverNumber: number;
  lapNumber: number;
  lapDuration: number | null;
  isPitOutLap: boolean;
}

export interface PitRecord {
  driverNumber: number;
  lapNumber: number;
  pitDuration: number | null;
}

export interface PitWindow {
  /** Lap on which this driver entered the pits. */
  pitLap: number;
  pitDuration: number | null;
  /** Recorded duration of the lap before the stop (in-lap). */
  inLap: number | null;
  /** Recorded duration of the pit lap itself (includes the stop). */
  stopLap: number | null;
  /** Recorded duration of the lap after the stop (out-lap). */
  outLap: number | null;
}

export interface UndercutAnalysis {
  driverA: number;
  driverB: number;
  /** Who pitted first, or "same" for the same lap. */
  firstToPit: "A" | "B" | "same";
  /** A undercut B (pitted earlier) / overcut (pitted later) / same lap. */
  strategy: "undercut" | "overcut" | "same-lap";
  windowA: PitWindow;
  windowB: PitWindow;
  /** Delta (B minus A cumulative time) on the last lap both completed before either pitted. Seconds; positive = A ahead. */
  deltaBefore: number | null;
  /** Same delta on the first lap both completed after both had pitted. */
  deltaAfter: number | null;
  /** deltaAfter - deltaBefore; positive = A gained through the window. */
  netGainA: number | null;
  /** True when the delta sign flipped across the window (a likely position swap). */
  positionsSwapped: boolean | null;
  /** Laps compared. */
  referenceLaps: { before: number | null; after: number | null };
}

/** Cumulative recorded race time at the end of each completed lap. */
export function cumulativeTimes(laps: LapSample[], driverNumber: number): Map<number, number> {
  const acc = new Map<number, number>();
  let total = 0;
  const own = laps
    .filter((l) => l.driverNumber === driverNumber)
    .sort((a, b) => a.lapNumber - b.lapNumber);
  for (const lap of own) {
    if (lap.lapDuration == null) continue;
    total += lap.lapDuration;
    acc.set(lap.lapNumber, total);
  }
  return acc;
}

function windowFor(driverNumber: number, pit: PitRecord, laps: LapSample[]): PitWindow {
  const dur = (lapNumber: number) =>
    laps.find((l) => l.driverNumber === driverNumber && l.lapNumber === lapNumber)?.lapDuration ?? null;
  return {
    pitLap: pit.lapNumber,
    pitDuration: pit.pitDuration,
    inLap: dur(pit.lapNumber - 1),
    stopLap: dur(pit.lapNumber),
    outLap: dur(pit.lapNumber + 1),
  };
}

/** Largest lap both drivers have a cumulative time for, at or before `lap`. */
function commonLapAtOrBefore(a: Map<number, number>, b: Map<number, number>, lap: number): number | null {
  let best: number | null = null;
  for (const [n] of a) {
    if (n <= lap && b.has(n) && (best === null || n > best)) best = n;
  }
  return best;
}

/** Smallest lap both drivers have a cumulative time for, at or after `lap`. */
function commonLapAtOrAfter(a: Map<number, number>, b: Map<number, number>, lap: number): number | null {
  let best: number | null = null;
  for (const [n] of a) {
    if (n >= lap && b.has(n) && (best === null || n < best)) best = n;
  }
  return best;
}

/**
 * Compare the first recorded pit stop of A against the first of B.
 * Returns null when either driver has no recorded stop (nothing to compare).
 */
export function analyzeUndercut(
  driverA: number,
  driverB: number,
  laps: LapSample[],
  pits: PitRecord[],
): UndercutAnalysis | null {
  const pitA = pits.filter((p) => p.driverNumber === driverA).sort((x, y) => x.lapNumber - y.lapNumber)[0];
  const pitB = pits.filter((p) => p.driverNumber === driverB).sort((x, y) => x.lapNumber - y.lapNumber)[0];
  if (!pitA || !pitB) return null;

  const cumA = cumulativeTimes(laps, driverA);
  const cumB = cumulativeTimes(laps, driverB);

  const firstPitLap = Math.min(pitA.lapNumber, pitB.lapNumber);
  const lastPitLap = Math.max(pitA.lapNumber, pitB.lapNumber);

  const lapBefore = commonLapAtOrBefore(cumA, cumB, firstPitLap - 1);
  const lapAfter = commonLapAtOrAfter(cumA, cumB, lastPitLap + 1);

  const delta = (lap: number | null) =>
    lap === null ? null : (cumB.get(lap) ?? 0) - (cumA.get(lap) ?? 0);
  const deltaBefore = delta(lapBefore);
  const deltaAfter = delta(lapAfter);

  return {
    driverA,
    driverB,
    firstToPit: pitA.lapNumber === pitB.lapNumber ? "same" : pitA.lapNumber < pitB.lapNumber ? "A" : "B",
    strategy: pitA.lapNumber === pitB.lapNumber ? "same-lap" : pitA.lapNumber < pitB.lapNumber ? "undercut" : "overcut",
    windowA: windowFor(driverA, pitA, laps),
    windowB: windowFor(driverB, pitB, laps),
    deltaBefore,
    deltaAfter,
    netGainA: deltaBefore !== null && deltaAfter !== null ? deltaAfter - deltaBefore : null,
    positionsSwapped:
      deltaBefore !== null && deltaAfter !== null && deltaBefore !== 0
        ? Math.sign(deltaBefore) !== Math.sign(deltaAfter) && deltaAfter !== 0
        : null,
    referenceLaps: { before: lapBefore, after: lapAfter },
  };
}
