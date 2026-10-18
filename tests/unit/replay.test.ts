import { describe, expect, it } from "vitest";
import {
  catmullRomClosedPath, extractLapOutline, formatRaceClock, positionAt, replayDuration,
  replayT0, smoothClosedLap, toReplayPoints,
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

describe("extractLapOutline", () => {
  it("cuts the trace at the first return near the start", () => {
    // Fake circuit: 100 points out, then back near the start at t=90.
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 100; i++) pts.push([i * 0.9, Math.sin(i / 100 * Math.PI * 2) * 1000, Math.cos(i / 100 * Math.PI * 2) * 1000]);
    // second lap (should be cut off)
    for (let i = 0; i <= 100; i++) pts.push([90 + i * 0.9, Math.sin(i / 100 * Math.PI * 2) * 1000, Math.cos(i / 100 * Math.PI * 2) * 1000]);
    const out = extractLapOutline(pts);
    expect(out.length).toBeLessThan(pts.length);
    expect(out[out.length - 1][0]).toBeLessThanOrEqual(91);
  });

  it("falls back gracefully on short or unclosed traces", () => {
    const short: [number, number, number][] = [[0, 0, 0], [10, 5, 5]];
    expect(extractLapOutline(short)).toEqual(short);
    const straight: [number, number, number][] = Array.from({ length: 500 }, (_, i) => [i, i * 10, 0]);
    expect(extractLapOutline(straight).length).toBeGreaterThan(0);
  });
});

  it("ignores a closed pit-lane sliver and picks the full-circuit lap", () => {
    const pts: [number, number, number][] = [];
    // Recon: out the pit lane and back in 90s — closed but nearly collinear.
    for (let i = 0; i <= 40; i++) pts.push([i, i * 100, i * 2]);
    for (let i = 40; i <= 80; i++) pts.push([i, (80 - i) * 100, (80 - i) * 2]);
    // Real lap: full circle of radius 1000, closed after ~90s.
    for (let i = 0; i <= 100; i++) pts.push([100 + i * 0.9, Math.sin(i / 100 * Math.PI * 2) * 1000, Math.cos(i / 100 * Math.PI * 2) * 1000]);
    const out = extractLapOutline(pts);
    const xs = out.map((p) => p[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1000);
  });

describe("smoothClosedLap", () => {
  it("denoises jitter while keeping the loop's span and closure", () => {
    // Noisy circle
    const pts: [number, number, number][] = Array.from({ length: 120 }, (_, i) => {
      const a = (i / 120) * Math.PI * 2;
      const jitter = (i % 2 === 0 ? 1 : -1) * 20;
      return [i, Math.cos(a) * (1000 + jitter), Math.sin(a) * (1000 + jitter)];
    });
    const out = smoothClosedLap(pts, 7);
    expect(out).toHaveLength(120);
    // Jitter reduced: radial deviation from 1000 shrinks
    const dev = (p: [number, number, number][]) => p.reduce((s, [, x, y]) => s + Math.abs(Math.hypot(x, y) - 1000), 0) / p.length;
    expect(dev(out)).toBeLessThan(dev(pts) / 2);
    // Span preserved within jitter bounds (no shrink to a point)
    const xs = out.map((p) => p[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1800);
  });

  it("returns short inputs unchanged", () => {
    const pts: [number, number, number][] = [[0, 0, 0], [1, 1, 1]];
    expect(smoothClosedLap(pts)).toEqual(pts);
  });
});

describe("catmullRomClosedPath", () => {
  it("passes through every point and closes", () => {
    const d = catmullRomClosedPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
    expect(d.startsWith("M0.0,0.0")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect((d.match(/C/g) ?? []).length).toBe(4);
    expect(d).toContain("100.0,0.0"); // passes through corner
  });

  it("handles degenerate inputs", () => {
    expect(catmullRomClosedPath([])).toBe("");
    expect(catmullRomClosedPath([{ x: 1, y: 2 }])).toBe("M1.0,2.0 Z");
  });
});
