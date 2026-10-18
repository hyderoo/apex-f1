/**
 * Race-replay math (pure, unit-tested). The /api/replay route downsamples
 * raw OpenF1 location points server-side; the player interpolates between
 * them client-side. Raw race data is ~35k points (~4.5 MB) per driver, so
 * everything here is built around keeping payloads and per-frame work small.
 */

import type { LocationPoint } from "@/lib/domain/types";

/** One downsampled sample: seconds since the session clock zero, x, y. */
export type ReplayPoint = [t: number, x: number, y: number];

export interface ReplayDriverTrack {
  driverNumber: number;
  points: ReplayPoint[];
}

/** Hard cap on drivers per replay — each one costs an OpenF1 request and
 *  ~0.5 MB of downsampled payload. */
export const REPLAY_MAX_DRIVERS = 8;
/** Target maximum samples kept per driver after downsampling. */
export const REPLAY_MAX_POINTS = 2000;

/**
 * Downsample to at most maxPoints by keeping every Nth point (plus the last).
 * Time is rebased to seconds from the first point of the whole session
 * (t0), so all drivers share one clock. Points with unparseable dates are
 * dropped rather than guessed.
 */
export function toReplayPoints(points: LocationPoint[], t0Ms: number, maxPoints = REPLAY_MAX_POINTS): ReplayPoint[] {
  const parsed: ReplayPoint[] = [];
  for (const p of points) {
    const ms = new Date(p.date).getTime();
    if (Number.isNaN(ms)) continue;
    parsed.push([Math.max(0, Math.round((ms - t0Ms) / 100) / 10), p.x, p.y]);
  }
  parsed.sort((a, b) => a[0] - b[0]);
  if (parsed.length <= maxPoints) return parsed;
  const stride = Math.ceil(parsed.length / maxPoints);
  const out: ReplayPoint[] = [];
  for (let i = 0; i < parsed.length; i += stride) out.push(parsed[i]);
  const last = parsed[parsed.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/** Earliest timestamp across all drivers — the shared clock zero. */
export function replayT0(tracks: { points: LocationPoint[] }[]): number {
  let t0 = Infinity;
  for (const t of tracks) {
    for (const p of t.points) {
      const ms = new Date(p.date).getTime();
      if (!Number.isNaN(ms) && ms < t0) t0 = ms;
    }
  }
  return t0 === Infinity ? 0 : t0;
}

/**
 * Position of one track at time t (seconds). Linear interpolation between
 * the bracketing samples; before the first / after the last sample the car
 * simply is not returned (the player hides it — honest about coverage
 * instead of clamping to a fake stationary dot).
 */
export function positionAt(points: ReplayPoint[], t: number): { x: number; y: number } | null {
  if (points.length === 0 || t < points[0][0] || t > points[points.length - 1][0]) return null;
  let lo = 0, hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid][0] <= t) lo = mid; else hi = mid;
  }
  const [t0, x0, y0] = points[lo];
  const [t1, x1, y1] = points[hi];
  if (t1 === t0) return { x: x0, y: y0 };
  const f = (t - t0) / (t1 - t0);
  return { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f };
}

/** End of the replay clock: latest sample across drivers. */
export function replayDuration(tracks: ReplayDriverTrack[]): number {
  let end = 0;
  for (const t of tracks) {
    const last = t.points[t.points.length - 1];
    if (last && last[0] > end) end = last[0];
  }
  return end;
}

/** mm:ss or h:mm:ss for the race clock. */
export function formatRaceClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

/**
 * Extract one clean lap loop from a track for drawing the circuit outline.
 * A full race trace (many laps + pit-lane excursions + gap chords) renders
 * as a scribble, so we find a closed lap: a run of points that returns near
 * its start after 60-300s. The trace also contains recon laps that leave
 * the pits and come straight back (closed, but a sliver), so candidates are
 * scored by bounding-box size and the widest loop wins — a real lap spans
 * the whole circuit.
 */
export function extractLapOutline(points: ReplayPoint[], maxPoints = 600): ReplayPoint[] {
  if (points.length < 50) return points;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [, x, y] of points) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const diag = Math.hypot(maxX - minX, maxY - minY);
  if (diag === 0) return points.slice(0, 60);

  const closeLap = (fromIdx: number): ReplayPoint[] | null => {
    const [t0, x0, y0] = points[fromIdx];
    for (let i = fromIdx + 30; i < points.length; i++) {
      const [t, x, y] = points[i];
      const elapsed = t - t0;
      if (elapsed > 300) return null; // no closure within 5 min — not a lap
      if (elapsed >= 60 && Math.hypot(x - x0, y - y0) < diag * 0.03) {
        return points.slice(fromIdx, i + 1);
      }
    }
    return null;
  };
  const bboxDiag = (lap: ReplayPoint[]): number => {
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
    for (const [, x, y] of lap) {
      if (x < a) a = x; if (x > b) b = x;
      if (y < c) c = y; if (y > d) d = y;
    }
    return Math.hypot(b - a, d - c);
  };

  // Candidate starts spread over the trace; a full-circuit lap has the
  // largest bounding box. Pit-lane slivers score near zero.
  let best: ReplayPoint[] | null = null;
  let bestScore = diag * 0.5; // must span at least half the circuit
  const step = Math.max(1, Math.floor(points.length / 25));
  for (let i = 0; i < points.length - 30; i += step) {
    const lap = closeLap(i);
    if (!lap || lap.length < 30) continue;
    const score = bboxDiag(lap);
    if (score > bestScore) { best = lap; bestScore = score; }
  }
  if (best) return decimate(best, maxPoints);
  return decimate(points.slice(0, 200), maxPoints);
}

function decimate(points: ReplayPoint[], max: number): ReplayPoint[] {
  if (points.length <= max) return points;
  const stride = Math.ceil(points.length / max);
  const out: ReplayPoint[] = [];
  for (let i = 0; i < points.length; i += stride) out.push(points[i]);
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/**
 * Loop-aware moving average over a closed lap. Denoises recorded GPS jitter
 * using only recorded points — the window wraps around the loop so the ends
 * blend cleanly. Window is the full neighborhood size (odd numbers keep the
 * centre point centred).
 */
export function smoothClosedLap(points: ReplayPoint[], window = 7): ReplayPoint[] {
  const n = points.length;
  if (n < 5 || window < 3) return points;
  const w = window % 2 === 0 ? window + 1 : window;
  const half = Math.floor(w / 2);
  const out: ReplayPoint[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let sx = 0, sy = 0;
    for (let k = -half; k <= half; k++) {
      const p = points[(i + k + n) % n];
      sx += p[1]; sy += p[2];
    }
    out[i] = [points[i][0], sx / w, sy / w];
  }
  return out;
}

/**
 * Closed Catmull-Rom spline through the given points as an SVG path (cubic
 * béziers). The curve passes through every input point — interpolating
 * recorded data, never inventing geometry.
 */
export function catmullRomClosedPath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n < 3) return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d + " Z";
}
