import { describe, expect, it } from "vitest";
import {
  formatRaceClock, positionAt, replayDuration, replayT0, toReplayPoints,
  REPLAY_MAX_POINTS,
} from "@/lib/f1/replay";
import type { LocationPoint } from "@/lib/domain/types";

const pt = (sec: number, x = 0, y = 0): LocationPoint => ({
  driverNumber: 4, date: new Date(sec * 1000).toISOString(), x, y, z: 0,
});

describe("toReplayPoints", () => {
  it("rebases time to the shared zero and sorts by time", () => {
    const t0 = 1_000_000;
    const out = toReplayPoints(
      [pt(t0 / 1000 + 20, 2), pt(t0 / 1000 + 10, 1)], t0,
    );
    expect(out).toEqual([[10, 1, 0], [20, 2, 0]]);
  });

  it("caps the sample count and always keeps the last point", () => {
    const many = Array.from({ length: 10_000 }, (_, i) => pt(i));
    const out = toReplayPoints(many, 0, 100);
    expect(out.length).toBeLessThanOrEqual(101);
    expect(out[out.length - 1][0]).toBe(9999);
  });

  it("drops unparseable dates instead of guessing", () => {
    const bad: LocationPoint = { driverNumber: 4, date: "not-a-date", x: 1, y: 2, z: 0 };
    expect(toReplayPoints([bad], 0)).toEqual([]);
  });
});

describe("positionAt", () => {
  const track = toReplayPoints([pt(0, 0, 0), pt(10, 100, 200), pt(20, 300, 600)], 0);

  it("interpolates linearly between samples", () => {
    expect(positionAt(track, 5)).toEqual({ x: 50, y: 100 });
    expect(positionAt(track, 15)).toEqual({ x: 200, y: 400 });
  });

  it("returns null outside the recorded window (no fake clamping)", () => {
    expect(positionAt(track, -1)).toBeNull();
    expect(positionAt(track, 21)).toBeNull();
    expect(positionAt([], 5)).toBeNull();
  });
});

describe("replayDuration / replayT0 / formatRaceClock", () => {
  it("computes the shared clock bounds", () => {
    const tracks = [
      { driverNumber: 1, points: toReplayPoints([pt(100), pt(300)], 0) },
      { driverNumber: 2, points: toReplayPoints([pt(50), pt(250)], 0) },
    ];
    expect(replayDuration(tracks)).toBe(300);
    expect(replayT0([{ points: [pt(50), pt(100)] }])).toBe(50_000);
  });

  it("formats the race clock", () => {
    expect(formatRaceClock(0)).toBe("0:00");
    expect(formatRaceClock(754)).toBe("12:34");
    expect(formatRaceClock(3661)).toBe("1:01:01");
  });
});
