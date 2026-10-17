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
