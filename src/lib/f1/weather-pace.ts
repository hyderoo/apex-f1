/**
 * Weather vs pace — descriptive statistics over one recorded session.
 *
 * Joins each lap to the nearest recorded weather sample by time and fits
 * an ordinary least-squares line (lap time vs track temperature). This is
 * an apparent relationship in a single session: fuel load, tyre age,
 * traffic and flags all move lap time too. The UI states this; R² is
 * shown so the strength of the apparent relationship is checkable.
 */

export interface WeatherSamplePoint {
  date: string;
  trackTemperature: number | null;
}

export interface LapPoint {
  lapNumber: number;
  dateStart: string | null;
  lapDuration: number | null;
  isPitOutLap: boolean;
}

export interface WeatherPacePoint {
  lapNumber: number;
  trackTemperature: number;
  lapDuration: number;
}

export interface WeatherPaceFit {
  points: WeatherPacePoint[];
  slope: number;        // seconds per °C of track temperature
  intercept: number;
  r2: number;
  tempRange: [number, number];
}

function nearestSample(samples: { t: number; temp: number }[], t: number): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const s of samples) {
    const d = Math.abs(s.t - t);
    if (d < bestDist) { bestDist = d; best = s.temp; }
  }
  // Ignore joins further than 15 minutes apart — weather is not sampled per lap.
  return bestDist <= 15 * 60_000 ? best : null;
}

export function fitWeatherPace(laps: LapPoint[], weather: WeatherSamplePoint[]): WeatherPaceFit | null {
  const samples = weather
    .filter((w) => w.trackTemperature !== null)
    .map((w) => ({ t: new Date(w.date).getTime(), temp: w.trackTemperature as number }))
    .sort((a, b) => a.t - b.t);
  if (samples.length < 2) return null;

  const points: WeatherPacePoint[] = [];
  for (const lap of laps) {
    if (lap.lapDuration === null || lap.isPitOutLap || !lap.dateStart) continue;
    const temp = nearestSample(samples, new Date(lap.dateStart).getTime());
    if (temp === null) continue;
    points.push({ lapNumber: lap.lapNumber, trackTemperature: temp, lapDuration: lap.lapDuration });
  }
  if (points.length < 5) return null;

  const temps = points.map((p) => p.trackTemperature);
  const tMin = Math.min(...temps);
  const tMax = Math.max(...temps);
  // A degenerate x-range (all samples at one temperature) fits nothing.
  if (tMax - tMin < 0.5) return null;

  const n = points.length;
  const mx = temps.reduce((a, b) => a + b, 0) / n;
  const my = points.reduce((a, p) => a + p.lapDuration, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const p of points) {
    const dx = p.trackTemperature - mx;
    const dy = p.lapDuration - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return { points, slope, intercept, r2, tempRange: [tMin, tMax] };
}
