import { describe, expect, it } from "vitest";
import {
  buildDistanceSeries, deriveMetrics, downsample, joinTelemetry, lapDelta, lapWindow,
} from "@/lib/telemetry/lap";
import { fitTrack, trackLengthMeters } from "@/lib/telemetry/track";
import type { CarDataSample, Lap, LocationPoint } from "@/lib/domain/types";

const lapRow = (n: number, start: string, dur: number): Lap => ({
  driverNumber: 1, lapNumber: n, dateStart: start, lapDuration: dur,
  durationSector1: null, durationSector2: null, durationSector3: null,
  i1Speed: null, i2Speed: null, stSpeed: null, isPitOutLap: false,
  segmentsSector1: [], segmentsSector2: [], segmentsSector3: [],
});

describe("lapWindow", () => {
  const laps = [
    lapRow(1, "2026-10-11T12:00:00Z", 90),
    lapRow(2, "2026-10-11T12:01:30Z", 91),
    lapRow(3, "2026-10-11T12:03:01Z", 92),
  ];
  it("uses the next lap start as the window end", () => {
    const w = lapWindow(laps, 1)!;
    expect(w.durationMs).toBe(90_000);
  });
  it("falls back to lap duration for the last lap", () => {
    const w = lapWindow(laps, 3)!;
    expect(w.durationMs).toBe(92_000);
  });
  it("returns null when no timing exists", () => {
    expect(lapWindow([{ ...lapRow(9, "", 0), dateStart: null }], 9)).toBeNull();
  });
});

const loc = (t: number, x: number, y: number): LocationPoint => ({
  driverNumber: 1, date: new Date(t).toISOString(), x, y, z: 0,
});

describe("buildDistanceSeries", () => {
  it("accumulates distance with the 1/10m unit scale", () => {
    const t0 = Date.parse("2026-10-11T12:00:00Z");
    // 100 raw units apart -> 10 m per step
    const series = buildDistanceSeries(
      [loc(t0, 0, 0), loc(t0 + 1000, 100, 0), loc(t0 + 2000, 200, 0)],
      { start: new Date(t0).toISOString(), end: new Date(t0 + 3000).toISOString(), durationMs: 3000 },
    );
    expect(series[2].distance).toBeCloseTo(20, 1);
  });
  it("rejects jitter spikes over 100 m per sample", () => {
    const t0 = Date.parse("2026-10-11T12:00:00Z");
    const series = buildDistanceSeries(
      [loc(t0, 0, 0), loc(t0 + 100, 50000, 0), loc(t0 + 1000, 100, 0), loc(t0 + 2000, 200, 0)],
      { start: new Date(t0).toISOString(), end: new Date(t0 + 3000).toISOString(), durationMs: 3000 },
    );
    // 5000 m spike ignored, step back from the spike also ignored,
    // then the genuine 10 m step is counted
    expect(series[3].distance).toBeCloseTo(10, 1);
  });
});

describe("joinTelemetry + lapDelta", () => {
  const t0 = Date.parse("2026-10-11T12:00:00Z");
  const win = { start: new Date(t0).toISOString(), end: new Date(t0 + 10_000).toISOString(), durationMs: 10_000 };
  const mkLoc = (offsetMs: number) =>
    Array.from({ length: 11 }, (_, i) => loc(t0 + offsetMs + i * 1000, i * 100, 0));
  const mkCar = (offsetMs: number, speed: number): CarDataSample[] =>
    Array.from({ length: 11 }, (_, i) => ({
      driverNumber: 1, date: new Date(t0 + offsetMs + i * 1000).toISOString(),
      speed, rpm: 10000, nGear: 6, throttle: 99, brake: 0, drs: 0,
    }));

  it("joins car data onto distance", () => {
    const series = buildDistanceSeries(mkLoc(0), win);
    const pts = joinTelemetry(mkCar(0, 300), series, win);
    expect(pts.length).toBe(11);
    expect(pts[10].distance).toBeCloseTo(100, 0);
    expect(pts[5].speed).toBe(300);
  });

  it("computes a positive delta when B is slower", () => {
    const aSeries = buildDistanceSeries(mkLoc(0), win);
    const bSeries = buildDistanceSeries(mkLoc(500), win); // B covers same distance 0.5s later
    const a = joinTelemetry(mkCar(0, 300), aSeries, win);
    const b = joinTelemetry(mkCar(500, 290), bSeries, win);
    const delta = lapDelta(a, b);
    expect(delta.length).toBeGreaterThan(50);
    expect(delta[delta.length - 1].delta).toBeCloseTo(0.5, 1);
  });
});

describe("downsample", () => {
  it("keeps endpoints and target size", () => {
    const rows = Array.from({ length: 1000 }, (_, i) => i);
    const out = downsample(rows, 100);
    expect(out.length).toBe(100);
    expect(out[0]).toBe(0);
    expect(out[99]).toBe(999);
  });
  it("returns small arrays untouched", () => {
    expect(downsample([1, 2], 100)).toEqual([1, 2]);
  });
});

describe("deriveMetrics", () => {
  it("computes max/avg/full-throttle and braking zones from the boolean brake signal", () => {
    const t0 = Date.parse("2026-10-11T12:00:00Z");
    const win = { start: new Date(t0).toISOString(), end: new Date(t0 + 5000).toISOString(), durationMs: 5000 };
    const series = buildDistanceSeries(
      Array.from({ length: 6 }, (_, i) => loc(t0 + i * 1000, i * 1000, 0)), win);
    const car: CarDataSample[] = Array.from({ length: 6 }, (_, i) => ({
      driverNumber: 1, date: new Date(t0 + i * 1000).toISOString(),
      speed: 300 - i * 10, rpm: 10000, nGear: i < 3 ? 8 : 7,
      throttle: i < 3 ? 100 : 40, brake: i >= 3 ? 100 : 0, drs: 0,
    }));
    const pts = joinTelemetry(car, series, win);
    const m = deriveMetrics(pts);
    expect(m.maxSpeed).toBe(300);
    expect(m.avgSpeed).toBeCloseTo(275);
    expect(m.fullThrottlePct).toBeCloseTo(50);
    expect(m.brakingZones.length).toBe(1);
    expect(m.gearChanges.length).toBe(1);
    expect(m.gearChanges[0].from).toBe(8);
    expect(m.gearChanges[0].to).toBe(7);
  });
});

describe("fitTrack", () => {
  const square = [loc(0, 0, 0), loc(1, 100, 0), loc(2, 100, 100), loc(3, 0, 100)];
  it("preserves aspect ratio and flips y", () => {
    const p = fitTrack(square, 800, 600, 24)!;
    const a = p.project(0, 0);
    const b = p.project(100, 0);
    const c = p.project(100, 100);
    expect(b.x - a.x).toBeCloseTo(a.y - c.y, 5); // equal scaling
    expect(c.y).toBeLessThan(b.y); // y flipped
  });
  it("returns null without enough points", () => {
    expect(fitTrack([loc(0, 0, 0)])).toBeNull();
  });
  it("computes a plausible loop length", () => {
    const len = trackLengthMeters(square)!;
    expect(len).toBeCloseTo(40, 0); // 4 × 10 m
  });
});
