import { describe, expect, it } from "vitest";
import { buildLeaderboard } from "@/lib/f1/leaderboard";
import type { Driver, IntervalPoint, Lap, PitStop, PositionPoint, Stint } from "@/lib/domain/types";

const drivers: Driver[] = [1, 44, 16].map((n) => ({
  driverNumber: n, broadcastName: "", fullName: `Driver ${n}`, firstName: "D",
  lastName: String(n), acronym: `D${n}`, teamName: "Team", teamColour: "ff0000",
  headshotUrl: null, countryCode: null,
}));

const lap = (n: number, lapNumber: number, dur: number | null, s1 = 30, s2 = 40, s3 = 30): Lap => ({
  driverNumber: n, lapNumber, dateStart: "2026-10-11T12:00:00Z",
  lapDuration: dur, durationSector1: s1, durationSector2: s2, durationSector3: s3,
  i1Speed: 280, i2Speed: 270, stSpeed: 285, isPitOutLap: false,
  segmentsSector1: [], segmentsSector2: [], segmentsSector3: [],
});

const positions: PositionPoint[] = [
  { driverNumber: 1, date: "2026-10-11T14:00:00Z", position: 1 },
  { driverNumber: 44, date: "2026-10-11T14:00:00Z", position: 2 },
];

describe("buildLeaderboard", () => {
  it("sorts by provider position, missing positions last", () => {
    const rows = buildLeaderboard({
      drivers, laps: [], intervals: [], positions, stints: [], pitStops: [],
    });
    expect(rows.map((r) => r.driverNumber)).toEqual([1, 44, 16]);
  });

  it("computes best lap and highlights session/personal best sectors", () => {
    const rows = buildLeaderboard({
      drivers,
      laps: [lap(1, 1, 95), lap(1, 2, 94), lap(44, 1, 96, 31, 40, 30)],
      intervals: [], positions, stints: [], pitStops: [],
    });
    const d1 = rows.find((r) => r.driverNumber === 1)!;
    expect(d1.bestLap).toBe(94);
    expect(d1.lastLap).toBe(94);
    expect(d1.sessionBestSectors[0]).toBe(true); // s1=30 beats 31
    const d44 = rows.find((r) => r.driverNumber === 44)!;
    expect(d44.sessionBestSectors[0]).toBe(false);
    expect(d44.personalBestSectors[1]).toBe(true);
  });

  it("derives tyre age from stint + current lap", () => {
    const stints: Stint[] = [{
      driverNumber: 1, stintNumber: 1, lapStart: 1, lapEnd: 20,
      compound: "MEDIUM", tyreAgeAtStart: 2,
    }];
    const rows = buildLeaderboard({
      drivers, laps: [lap(1, 10, 95)], intervals: [], positions, stints, pitStops: [],
    });
    const d1 = rows.find((r) => r.driverNumber === 1)!;
    expect(d1.compound).toBe("MEDIUM");
    expect(d1.tyreAge).toBe(2 + 9);
  });

  it("keeps gaps as strings (lapped) or numbers", () => {
    const intervals: IntervalPoint[] = [
      { driverNumber: 1, date: "2026-10-11T14:00:00Z", gapToLeader: 0, interval: null },
      { driverNumber: 44, date: "2026-10-11T14:00:00Z", gapToLeader: "+1 LAP", interval: 2.5 },
    ];
    const rows = buildLeaderboard({
      drivers, laps: [], intervals, positions, stints: [], pitStops: [],
    });
    expect(rows.find((r) => r.driverNumber === 44)!.gapToLeader).toBe("+1 LAP");
    expect(rows.find((r) => r.driverNumber === 1)!.gapToLeader).toBe(0);
  });

  it("counts pit stops", () => {
    const pitStops: PitStop[] = [
      { driverNumber: 44, date: "2026-10-11T13:00:00Z", lapNumber: 18, pitDuration: 24.1 },
      { driverNumber: 44, date: "2026-10-11T13:40:00Z", lapNumber: 40, pitDuration: 25.0 },
    ];
    const rows = buildLeaderboard({
      drivers, laps: [], intervals: [], positions, stints: [], pitStops,
    });
    expect(rows.find((r) => r.driverNumber === 44)!.pitStops).toBe(2);
  });

  it("handles empty inputs without NaN", () => {
    const rows = buildLeaderboard({
      drivers, laps: [], intervals: [], positions: [], stints: [], pitStops: [],
    });
    for (const r of rows) {
      expect(r.lastLap).toBeNull();
      expect(r.bestLap).toBeNull();
      expect(r.position).toBeNull();
    }
  });
});
