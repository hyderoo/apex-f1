import { describe, expect, it } from "vitest";
import { countRemainingRounds, pointsFor, projectChampionship, type WhatIfDriver } from "@/lib/f1/whatif";

const drv = (driverId: string, position: number, points: number): WhatIfDriver =>
  ({ driverId, familyName: driverId, code: null, position, points, constructorIds: [] });

describe("pointsFor", () => {
  it("maps finishing positions to F1 points", () => {
    expect(pointsFor(1)).toBe(25);
    expect(pointsFor(2)).toBe(18);
    expect(pointsFor(10)).toBe(1);
    expect(pointsFor(11)).toBe(0);
    expect(pointsFor(20)).toBe(0);
    expect(pointsFor(1, true)).toBe(8);
    expect(pointsFor(8, true)).toBe(1);
    expect(pointsFor(9, true)).toBe(0);
  });
});

describe("projectChampionship", () => {
  const standings = [drv("a", 1, 100), drv("b", 2, 90), drv("c", 3, 50)];

  it("scores the chosen driver at the assumed position, others at season average", () => {
    // 10 rounds done → average 10/9/5 per race; 2 races left, no sprints.
    const rows = projectChampionship({
      standings, chosenDriverId: "c", assumedPosition: 1,
      remainingRaces: 2, remainingSprints: 0, roundsCompleted: 10,
    });
    const c = rows.find((r) => r.driverId === "c")!;
    expect(c.projectedPoints).toBe(50 + 2 * 25);
    const a = rows.find((r) => r.driverId === "a")!;
    expect(a.projectedPoints).toBe(100 + 2 * 10);
    expect(a.isChosen).toBe(false);
    expect(c.isChosen).toBe(true);
  });

  it("re-sorts and reports position deltas", () => {
    const rows = projectChampionship({
      standings, chosenDriverId: "c", assumedPosition: 1,
      remainingRaces: 3, remainingSprints: 0, roundsCompleted: 10,
    });
    // c: 50+75=125, a: 100+30=130, b: 90+27=117 → a stays P1, c P2, b P3
    expect(rows.map((r) => r.driverId)).toEqual(["a", "c", "b"]);
    expect(rows[1].positionDelta).toBe(1);   // c gains one place
    expect(rows[2].positionDelta).toBe(-1);  // b loses one
    expect(rows[0].projectedPosition).toBe(1);
  });

  it("includes sprint rounds on the sprint scale", () => {
    const rows = projectChampionship({
      standings, chosenDriverId: "b", assumedPosition: 2,
      remainingRaces: 1, remainingSprints: 1, roundsCompleted: 10,
    });
    const b = rows.find((r) => r.driverId === "b")!;
    expect(b.projectedPoints).toBe(90 + 18 + 7);
  });

  it("handles zero completed rounds without dividing by zero", () => {
    const rows = projectChampionship({
      standings, chosenDriverId: "a", assumedPosition: 3,
      remainingRaces: 1, remainingSprints: 0, roundsCompleted: 0,
    });
    expect(rows.find((r) => r.driverId === "b")!.projectedPoints).toBe(90);
    expect(rows.find((r) => r.driverId === "a")!.projectedPoints).toBe(100 + 15);
  });
});

describe("countRemainingRounds", () => {
  it("splits past and future rounds and detects sprint weekends", () => {
    const rounds = [
      { date: "2026-03-08", sessions: [{ name: "Race" }] },
      { date: "2026-12-01", sessions: [{ name: "Sprint" }, { name: "Race" }] },
      { date: "2026-12-08", sessions: [{ name: "Race" }] },
    ];
    const r = countRemainingRounds(rounds, new Date("2026-10-18T00:00:00Z"));
    expect(r).toEqual({ races: 2, sprints: 1, completed: 1 });
  });
});
