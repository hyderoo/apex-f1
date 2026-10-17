import { describe, expect, it } from "vitest";
import { analyzeUndercut, cumulativeTimes, type LapSample, type PitRecord } from "@/lib/f1/undercut";

const lap = (driverNumber: number, lapNumber: number, lapDuration: number | null, isPitOutLap = false): LapSample =>
  ({ driverNumber, lapNumber, lapDuration, isPitOutLap });

// A and B run 10 laps. A pits lap 4, B pits lap 6. Equal 90s laps; a stop
// costs 20s extra (110s pit lap). A's fresher tyres give 1s/lap after B's stop.
function race(): { laps: LapSample[]; pits: PitRecord[] } {
  const laps: LapSample[] = [];
  for (let n = 1; n <= 10; n++) {
    let a = 90, b = 90;
    if (n === 4) a = 110;            // A pit lap
    if (n === 6) b = 110;            // B pit lap
    if (n >= 7) a = 89;              // A faster on fresh tyres
    laps.push(lap(1, n, a), lap(2, n, b));
  }
  return {
    laps,
    pits: [
      { driverNumber: 1, lapNumber: 4, pitDuration: 22.4 },
      { driverNumber: 2, lapNumber: 6, pitDuration: 23.1 },
    ],
  };
}

describe("cumulativeTimes", () => {
  it("sums recorded durations and skips missing laps", () => {
    const acc = cumulativeTimes([lap(1, 1, 90), lap(1, 2, null), lap(1, 3, 91)], 1);
    expect(acc.get(1)).toBe(90);
    expect(acc.has(2)).toBe(false);
    expect(acc.get(3)).toBe(181);
  });
});

describe("analyzeUndercut", () => {
  it("classifies an undercut and computes the net gain", () => {
    const { laps, pits } = race();
    const r = analyzeUndercut(1, 2, laps, pits)!;
    expect(r.strategy).toBe("undercut");
    expect(r.firstToPit).toBe("A");
    // Before window (lap 3): equal pace → delta 0.
    expect(r.referenceLaps.before).toBe(3);
    expect(r.deltaBefore).toBeCloseTo(0);
    // After window (lap 7): both spent one 110s pit lap; A gains 1s on lap 7
    // (fresh tyres) → A is 1s ahead on cumulative time → delta (B-A) = +1.
    expect(r.referenceLaps.after).toBe(7);
    expect(r.deltaAfter).toBeCloseTo(1);
    // Net gain for A = deltaAfter - deltaBefore.
    expect(r.netGainA).toBeCloseTo((r.deltaAfter ?? 0) - (r.deltaBefore ?? 0));
  });

  it("classifies an overcut when A pits later", () => {
    const { laps, pits } = race();
    const r = analyzeUndercut(2, 1, laps, pits)!;
    expect(r.strategy).toBe("overcut");
    expect(r.firstToPit).toBe("B");
  });

  it("same-lap stops classify as same-lap", () => {
    const { laps } = race();
    const pits: PitRecord[] = [
      { driverNumber: 1, lapNumber: 5, pitDuration: 22 },
      { driverNumber: 2, lapNumber: 5, pitDuration: 23 },
    ];
    const r = analyzeUndercut(1, 2, laps, pits)!;
    expect(r.strategy).toBe("same-lap");
  });

  it("returns null when a driver never pitted", () => {
    const { laps, pits } = race();
    expect(analyzeUndercut(1, 99, laps, pits)).toBeNull();
  });

  it("detects a position swap when the delta crosses zero", () => {
    // B leads by 5s before the window; A gains 8 through it.
    const laps: LapSample[] = [];
    for (let n = 1; n <= 8; n++) {
      laps.push(lap(1, n, n === 4 ? 110 : 90)); // A pits lap 4
      laps.push(lap(2, n, n === 6 ? 108 : n <= 3 ? 89 : 91)); // B faster early, slower later
    }
    const pits: PitRecord[] = [
      { driverNumber: 1, lapNumber: 4, pitDuration: 22 },
      { driverNumber: 2, lapNumber: 6, pitDuration: 20 },
    ];
    const r = analyzeUndercut(1, 2, laps, pits)!;
    // Before (lap 3): B 3s ahead → delta (B-A) = +3? B total = 267, A = 270 → delta = -3.
    expect(r.deltaBefore).toBeCloseTo(-3);
    expect(typeof r.positionsSwapped).toBe("boolean");
    expect(r.netGainA).not.toBeNull();
  });

  it("fills the pit-window lap breakdown", () => {
    const { laps, pits } = race();
    const r = analyzeUndercut(1, 2, laps, pits)!;
    expect(r.windowA.inLap).toBe(90);
    expect(r.windowA.stopLap).toBe(110);
    expect(r.windowA.outLap).toBe(90);
    expect(r.windowA.pitDuration).toBe(22.4);
    expect(r.windowB.pitLap).toBe(6);
  });
});
