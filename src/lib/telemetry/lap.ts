import type { CarDataSample, Lap, LocationPoint } from "@/lib/domain/types";

/** Units of OpenF1 location x/y. FastF1 scales these by 10 to meters. */
export const LOCATION_UNIT_TO_METERS = 1 / 10;

export interface LapWindow {
  start: string; // ISO
  end: string; // ISO
  durationMs: number;
}

/** Determine the time window covered by a lap from the session's lap records. */
export function lapWindow(laps: Lap[], lapNumber: number): LapWindow | null {
  const lap = laps.find((l) => l.lapNumber === lapNumber && l.dateStart);
  if (!lap?.dateStart) return null;
  const start = new Date(lap.dateStart).getTime();
  const next = laps.find((l) => l.lapNumber === lapNumber + 1 && l.dateStart);
  let end: number;
  if (next?.dateStart) {
    end = new Date(next.dateStart).getTime();
  } else if (lap.lapDuration != null && lap.lapDuration > 0) {
    end = start + lap.lapDuration * 1000;
  } else {
    return null;
  }
  if (end <= start) return null;
  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    durationMs: end - start,
  };
}

export interface DistancePoint {
  t: number; // ms since lap start
  distance: number; // meters (approximate)
  x: number;
  y: number;
  date: string;
}

/**
 * Build cumulative distance along a lap from raw location points.
 * Distance is an approximation (documented): straight-line between recorded
 * points, with the OpenF1 coordinate scale factor applied.
 */
export function buildDistanceSeries(
  locations: LocationPoint[],
  window: LapWindow,
): DistancePoint[] {
  const t0 = new Date(window.start).getTime();
  const t1 = new Date(window.end).getTime();
  const pts = locations
    .map((p) => ({ p, t: new Date(p.date).getTime() }))
    .filter(({ t }) => t >= t0 - 500 && t <= t1 + 500)
    .sort((a, b) => a.t - b.t);
  let dist = 0;
  const out: DistancePoint[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) {
      const dx = pts[i].p.x - pts[i - 1].p.x;
      const dy = pts[i].p.y - pts[i - 1].p.y;
      const step = Math.hypot(dx, dy) * LOCATION_UNIT_TO_METERS;
      // ignore GPS jitter spikes
      if (step < 100) dist += step;
    }
    out.push({ t: pts[i].t - t0, distance: dist, x: pts[i].p.x, y: pts[i].p.y, date: pts[i].p.date });
  }
  return out;
}

/** Interpolate distance at time t (ms since lap start). */
export function distanceAtTime(series: DistancePoint[], t: number): number | null {
  if (series.length === 0) return null;
  if (t <= series[0].t) return series[0].distance;
  if (t >= series[series.length - 1].t) return series[series.length - 1].distance;
  let lo = 0, hi = series.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (series[mid].t <= t) lo = mid; else hi = mid;
  }
  const a = series[lo], b = series[hi];
  const f = (t - a.t) / (b.t - a.t || 1);
  return a.distance + f * (b.distance - a.distance);
}

export interface TelemetryPoint {
  t: number;
  distance: number | null;
  speed: number | null;
  throttle: number | null;
  brake: number | null;
  rpm: number | null;
  gear: number | null;
  drs: number | null;
  date: string;
}

/** Join car data onto lap distance via time interpolation. */
export function joinTelemetry(
  carData: CarDataSample[],
  series: DistancePoint[],
  window: LapWindow,
): TelemetryPoint[] {
  const t0 = new Date(window.start).getTime();
  const t1 = new Date(window.end).getTime();
  return carData
    .map((c) => ({ c, t: new Date(c.date).getTime() }))
    .filter(({ t }) => t >= t0 - 500 && t <= t1 + 500)
    .sort((a, b) => a.t - b.t)
    .map(({ c, t }) => ({
      t: t - t0,
      distance: series.length > 1 ? distanceAtTime(series, t - t0) : null,
      speed: c.speed,
      throttle: c.throttle,
      brake: c.brake,
      rpm: c.rpm,
      gear: c.nGear,
      drs: c.drs,
      date: c.date,
    }));
}

/** Stride downsampling that always keeps endpoints. */
export function downsample<T>(rows: T[], maxPoints: number): T[] {
  if (rows.length <= maxPoints || maxPoints < 2) return rows;
  const stride = (rows.length - 1) / (maxPoints - 1);
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(rows[Math.round(i * stride)]);
  }
  return out;
}

/**
 * Time delta between two drivers across a lap, computed by interpolating
 * each driver's elapsed time at common distances. Positive = driver B slower.
 */
export function lapDelta(
  a: TelemetryPoint[],
  b: TelemetryPoint[],
): { distance: number; delta: number }[] {
  const aPts = a.filter((p) => p.distance != null) as (TelemetryPoint & { distance: number })[];
  const bPts = b.filter((p) => p.distance != null) as (TelemetryPoint & { distance: number })[];
  if (aPts.length < 2 || bPts.length < 2) return [];
  const timeAtDistance = (pts: (TelemetryPoint & { distance: number })[], d: number): number | null => {
    if (d <= pts[0].distance) return pts[0].t;
    if (d >= pts[pts.length - 1].distance) return pts[pts.length - 1].t;
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid].distance <= d) lo = mid; else hi = mid;
    }
    const pa = pts[lo], pb = pts[hi];
    const f = (d - pa.distance) / (pb.distance - pa.distance || 1);
    return pa.t + f * (pb.t - pa.t);
  };
  const maxD = Math.min(aPts[aPts.length - 1].distance, bPts[bPts.length - 1].distance);
  const N = 100;
  const out: { distance: number; delta: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const d = (maxD * i) / N;
    const ta = timeAtDistance(aPts, d);
    const tb = timeAtDistance(bPts, d);
    if (ta != null && tb != null) out.push({ distance: d, delta: (tb - ta) / 1000 });
  }
  return out;
}

export interface DerivedMetrics {
  maxSpeed: number | null;
  avgSpeed: number | null;
  fullThrottlePct: number | null;
  brakingZones: { startDistance: number; endDistance: number }[];
  gearChanges: { distance: number; from: number; to: number }[];
}

/**
 * Derived metrics. Documented model:
 * - fullThrottlePct: share of samples with throttle >= 98%.
 * - brakingZones: contiguous runs where brake signal is on (OpenF1 brake is
 *   a boolean 0/100, NOT pressure), min length 2 samples, gaps < 3 samples merged.
 * - gearChanges: consecutive gear value changes.
 */
export function deriveMetrics(points: TelemetryPoint[]): DerivedMetrics {
  const speeds = points.map((p) => p.speed).filter((s): s is number => s != null);
  const throttles = points.map((p) => p.throttle).filter((s): s is number => s != null);
  const withDist = points.filter((p) => p.distance != null);

  const brakingZones: DerivedMetrics["brakingZones"] = [];
  let zoneStart: number | null = null;
  let lastBrakeIdx = -10;
  for (let i = 0; i < withDist.length; i++) {
    const p = withDist[i];
    const braking = (p.brake ?? 0) > 0;
    if (braking) {
      if (zoneStart == null) zoneStart = p.distance!;
      else if (i - lastBrakeIdx > 3) { zoneStart = p.distance!; }
      lastBrakeIdx = i;
    } else if (zoneStart != null && i - lastBrakeIdx > 3) {
      const end = withDist[lastBrakeIdx]?.distance ?? p.distance!;
      if (end - zoneStart > 1) brakingZones.push({ startDistance: zoneStart, endDistance: end });
      zoneStart = null;
    }
  }
  if (zoneStart != null && lastBrakeIdx >= 0) {
    brakingZones.push({ startDistance: zoneStart, endDistance: withDist[lastBrakeIdx].distance! });
  }

  const gearChanges: DerivedMetrics["gearChanges"] = [];
  for (let i = 1; i < withDist.length; i++) {
    const g0 = withDist[i - 1].gear, g1 = withDist[i].gear;
    if (g0 != null && g1 != null && g0 !== g1 && g0 > 0 && g1 > 0) {
      gearChanges.push({ distance: withDist[i].distance!, from: g0, to: g1 });
    }
  }

  return {
    maxSpeed: speeds.length ? Math.max(...speeds) : null,
    avgSpeed: speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
    fullThrottlePct: throttles.length
      ? (throttles.filter((t) => t >= 98).length / throttles.length) * 100
      : null,
    brakingZones,
    gearChanges,
  };
}
