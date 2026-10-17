/**
 * Championship what-if calculator — a clearly labelled SIMULATION.
 *
 * Nothing here is a prediction. The chosen driver's remaining rounds are
 * scored at a single assumed finishing position the user picks. Every
 * other driver keeps scoring at their season average (current points /
 * completed rounds). Both assumptions are stated on the panel. Sprint
 * rounds use the sprint scale and are counted separately.
 */

export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const;
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export function pointsFor(position: number, sprint = false): number {
  const table = sprint ? SPRINT_POINTS : RACE_POINTS;
  return position >= 1 && position <= table.length ? table[position - 1] : 0;
}

export interface WhatIfDriver {
  driverId: string;
  familyName: string;
  code: string | null;
  position: number;
  points: number;
  constructorIds: string[];
}

export interface ProjectionRow extends WhatIfDriver {
  projectedPoints: number;
  projectedPosition: number;
  positionDelta: number; // current - projected; positive = gains places
  isChosen: boolean;
}

export function projectChampionship(input: {
  standings: WhatIfDriver[];
  chosenDriverId: string;
  assumedPosition: number; // finishing position in every remaining race
  remainingRaces: number;
  remainingSprints: number;
  roundsCompleted: number;
}): ProjectionRow[] {
  const { standings, chosenDriverId, assumedPosition, remainingRaces, remainingSprints, roundsCompleted } = input;
  const racePts = pointsFor(assumedPosition);
  const sprintPts = pointsFor(assumedPosition, true);

  const rows = standings.map((d) => {
    const isChosen = d.driverId === chosenDriverId;
    const perRace = isChosen
      ? racePts
      : roundsCompleted > 0
        ? d.points / roundsCompleted // season average — the stated assumption
        : 0;
    const perSprint = isChosen
      ? sprintPts
      : roundsCompleted > 0
        ? (d.points / roundsCompleted) * (8 / 25) // same scoring-rate assumption, sprint scale
        : 0;
    return {
      ...d,
      isChosen,
      projectedPoints: Math.round(d.points + remainingRaces * perRace + remainingSprints * perSprint),
      projectedPosition: 0,
      positionDelta: 0,
    };
  });

  rows.sort((a, b) => b.projectedPoints - a.projectedPoints || b.points - a.points);
  rows.forEach((r, i) => {
    r.projectedPosition = i + 1;
    r.positionDelta = r.position - r.projectedPosition;
  });
  return rows;
}

/** Count remaining vs completed rounds (races and sprint sessions) from the
 *  Jolpica calendar. `now` is injectable for tests; defaults to the current
 *  time at call time. */
export function countRemainingRounds(
  rounds: { date: string; sessions: { name: string }[] }[],
  now: Date = new Date(),
): { races: number; sprints: number; completed: number } {
  const nowMs = now.getTime();
  const out = { races: 0, sprints: 0, completed: 0 };
  for (const round of rounds) {
    const done = new Date(round.date).getTime() <= nowMs;
    if (done) out.completed++;
    else {
      out.races++;
      if (round.sessions.some((sn) => /sprint/i.test(sn.name))) out.sprints++;
    }
  }
  return out;
}
