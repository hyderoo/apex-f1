/**
 * Corner detection from recorded GPS points of one lap.
 *
 * This is an approximation: heading changes are measured between windowed
 * neighbours, and local maxima of absolute turn rate become corners. A
 * plausible circuit has a handful to a few dozen corners; anything outside
 * that band is treated as unreliable and reported as no corners rather than
 * showing wrong numbers.
 */

export interface TrackPoint {
  x: number;
  y: number;
  t?: number;
  distance?: number;
}

export interface DetectedCorner {
  /** 1-based corner number in lap order */
  number: number;
  x: number;
  y: number;
  distance: number | null;
  /** absolute heading change at the corner, radians */
  turn: number;
}

const MIN_CORNERS = 4;
const MAX_CORNERS = 30;
/** minimum absolute heading change across the window to count as a corner */
const TURN_THRESHOLD = 0.35;

function angleDelta(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export function detectCorners(points: TrackPoint[]): DetectedCorner[] {
  const n = points.length;
  if (n < 60) return [];
  const k = Math.max(3, Math.round(n * 0.008)); // smoothing half-window
  const gap = Math.max(4, Math.round(n * 0.02)); // min separation between corners

  const heading = (i: number) => {
    const a = points[((i - k) % n + n) % n];
    const b = points[(i + k) % n];
    return Math.atan2(b.y - a.y, b.x - a.x);
  };

  const turn: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    turn[i] = angleDelta(heading((i - k + n) % n), heading((i + k) % n));
  }

  // local maxima of |turn| above threshold
  const candidates: { i: number; strength: number }[] = [];
  for (let i = 0; i < n; i++) {
    const v = Math.abs(turn[i]);
    if (v < TURN_THRESHOLD) continue;
    let isMax = true;
    for (let j = 1; j <= gap; j++) {
      if (Math.abs(turn[(i + j) % n]) > v || Math.abs(turn[(i - j + n) % n]) > v) { isMax = false; break; }
    }
    if (isMax) candidates.push({ i, strength: v });
  }

  // greedy separation: keep strongest, drop neighbours within gap
  candidates.sort((a, b) => b.strength - a.strength);
  const kept: number[] = [];
  for (const c of candidates) {
    if (kept.every((j) => Math.min((c.i - j + n) % n, (j - c.i + n) % n) >= gap)) kept.push(c.i);
  }
  kept.sort((a, b) => a - b);

  if (kept.length < MIN_CORNERS || kept.length > MAX_CORNERS) return [];

  return kept.map((i, idx) => ({
    number: idx + 1,
    x: points[i].x,
    y: points[i].y,
    distance: points[i].distance ?? null,
    turn: turn[i],
  }));
}

/**
 * Elapsed times (ms from lap start) at which sectors 1 and 2 end, from the
 * recorded sector durations (seconds) of the lap. Returns null when any
 * sector time is missing — partial boundaries would be wrong.
 */
export function sectorBoundaryTimes(
  sectors: (number | null)[] | null | undefined,
): [number, number] | null {
  if (!sectors || sectors.length < 3) return null;
  const [s1, s2] = sectors;
  if (s1 == null || s2 == null || s1 <= 0 || s2 <= 0) return null;
  return [s1 * 1000, (s1 + s2) * 1000];
}
