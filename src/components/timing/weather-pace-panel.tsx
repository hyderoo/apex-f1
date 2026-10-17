"use client";

import { useMemo, useState } from "react";
import type { Driver, PitStop } from "@/lib/domain/types";
import { fitWeatherPace } from "@/lib/f1/weather-pace";
import { formatDuration } from "@/lib/utils/format";

interface LapRow {
  driverNumber: number; lapNumber: number; dateStart: string | null;
  lapDuration: number | null; isPitOutLap: boolean;
}
interface WeatherRow { date: string; airTemperature: number | null; trackTemperature: number | null }

const W = 720, H = 260, PAD = { l: 64, r: 16, t: 12, b: 26 };
const fmt = (s: number) => formatDuration(s);

/**
 * Weather vs pace: recorded lap times against recorded track temperature,
 * one session, one driver. Descriptive only — the caption says so.
 */
export function WeatherPacePanel({
  drivers, laps, weather, pitStops,
}: {
  drivers: Driver[]; laps: LapRow[]; weather: WeatherRow[]; pitStops: PitStop[];
}) {
  const [dn, setDn] = useState<number | null>(drivers[0]?.driverNumber ?? null);
  const driver = drivers.find((d) => d.driverNumber === dn) ?? drivers[0];

  const fit = useMemo(() => {
    if (!driver) return null;
    const pitInLaps = new Set(pitStops.filter((p) => p.driverNumber === driver.driverNumber).map((p) => p.lapNumber));
    return fitWeatherPace(
      laps.filter((l) => l.driverNumber === driver.driverNumber && !pitInLaps.has(l.lapNumber)),
      weather,
    );
  }, [driver, laps, weather, pitStops]);

  const x = (t: number) => fit ? PAD.l + ((t - fit.tempRange[0]) / (fit.tempRange[1] - fit.tempRange[0])) * (W - PAD.l - PAD.r) : 0;
  const yMin = fit ? Math.min(...fit.points.map((p) => p.lapDuration)) : 0;
  const yMax = fit ? Math.max(...fit.points.map((p) => p.lapDuration)) : 1;
  const y = (v: number) => PAD.t + (1 - (v - yMin) / Math.max(yMax - yMin, 0.001)) * (H - PAD.t - PAD.b);

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-2.5">
        <span className="micro-label">Weather vs pace · recorded data</span>
        <select
          value={dn ?? undefined}
          onChange={(e) => setDn(Number(e.target.value))}
          className="h-8 border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs"
          aria-label="Driver for weather vs pace view"
        >
          {drivers.map((d) => (
            <option key={d.driverNumber} value={d.driverNumber}>{d.acronym} — {d.fullName}</option>
          ))}
        </select>
      </div>
      {!fit && (
        <div className="p-8 text-center text-sm text-[var(--ink-3)]">
          Not enough joinable lap and weather records for this driver in this session.
        </div>
      )}
      {fit && (
        <div className="p-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Lap time vs track temperature with fitted trend line">
            {[0, 0.5, 1].map((f) => {
              const t = fit.tempRange[0] + f * (fit.tempRange[1] - fit.tempRange[0]);
              const v = yMin + f * (yMax - yMin);
              return (
                <g key={f}>
                  <text x={x(t)} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--ink-3)" fontFamily="var(--font-mono)">{t.toFixed(1)}°C</text>
                  <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="var(--ink-3)" fontFamily="var(--font-mono)">{fmt(v)}</text>
                  <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
                </g>
              );
            })}
            {/* OLS trend line across the recorded temperature range */}
            <line
              x1={x(fit.tempRange[0])} y1={y(fit.intercept + fit.slope * fit.tempRange[0])}
              x2={x(fit.tempRange[1])} y2={y(fit.intercept + fit.slope * fit.tempRange[1])}
              stroke="var(--accent)" strokeWidth={1.8} strokeDasharray="6 4"
            />
            {fit.points.map((p) => (
              <circle key={p.lapNumber} cx={x(p.trackTemperature)} cy={y(p.lapDuration)} r={2.6} fill="var(--ink-2)">
                <title>{`Lap ${p.lapNumber} · ${fmt(p.lapDuration)} at ${p.trackTemperature.toFixed(1)}°C track`}</title>
              </circle>
            ))}
          </svg>
          <div className="mt-3 flex flex-wrap gap-4 font-mono text-[11px] tnum text-[var(--ink-2)]">
            <span>Trend {fit.slope >= 0 ? "+" : "−"}{Math.abs(fit.slope).toFixed(3)}s / °C track</span>
            <span>R² {fit.r2.toFixed(3)}</span>
            <span>n = {fit.points.length} laps</span>
            <span>Track {fit.tempRange[0].toFixed(1)}–{fit.tempRange[1].toFixed(1)}°C</span>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-[var(--ink-3)]">
            Each point is a recorded lap joined to the nearest recorded weather sample (pit-in and pit-out laps
            excluded; joins over 15 minutes apart ignored). The dashed line is a least-squares fit over
            this one session. Fuel burn, tyre age, traffic and flags move lap time too — an apparent
            relationship here is not evidence that temperature caused it.
          </p>
        </div>
      )}
    </div>
  );
}
