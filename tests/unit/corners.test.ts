import { describe, expect, it } from "vitest";
import { detectCorners, sectorBoundaryTimes, type TrackPoint } from "@/lib/telemetry/corners";

/** synthetic closed loop with `corners` sharp vertices on a circle */
function polygonTrack(vertices: number, samplesPerEdge = 40): TrackPoint[] {
  const pts: TrackPoint[] = [];
  const R = 100;
  const verts = Array.from({ length: vertices }, (_, i) => ({
    x: R * Math.cos((2 * Math.PI * i) / vertices),
    y: R * Math.sin((2 * Math.PI * i) / vertices),
  }));
  for (let i = 0; i < vertices; i++) {
    const a = verts[i], b = verts[(i + 1) % vertices];
    for (let j = 0; j < samplesPerEdge; j++) {
      const f = j / samplesPerEdge;
      pts.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, t: pts.length * 100 });
    }
  }
  return pts;
}

function circleTrack(n = 800): TrackPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    x: 100 * Math.cos((2 * Math.PI * i) / n),
    y: 100 * Math.sin((2 * Math.PI * i) / n),
    t: i * 100,
  }));
}

describe("detectCorners", () => {
  it("finds the corners of a sharp polygon track", () => {
    const corners = detectCorners(polygonTrack(8));
    expect(corners.length).toBeGreaterThanOrEqual(6);
    expect(corners.length).toBeLessThanOrEqual(10);
    expect(corners[0].number).toBe(1);
    // numbers are sequential
    corners.forEach((c, i) => expect(c.number).toBe(i + 1));
  });

  it("returns nothing for a smooth circle (no reliable corners)", () => {
    expect(detectCorners(circleTrack())).toEqual([]);
  });

  it("returns nothing for too few points", () => {
    expect(detectCorners(polygonTrack(6).slice(0, 30))).toEqual([]);
  });
});

describe("sectorBoundaryTimes", () => {
  it("converts sector durations to elapsed ms boundaries", () => {
    expect(sectorBoundaryTimes([30.5, 41.2, 28.9])).toEqual([30500, 71700]);
  });
  it("returns null when any sector is missing", () => {
    expect(sectorBoundaryTimes([30.5, null, 28.9])).toBeNull();
    expect(sectorBoundaryTimes(null)).toBeNull();
    expect(sectorBoundaryTimes([])).toBeNull();
  });
});
