"use client";

import { useMemo, useState } from "react";
import type { Driver, PitStop, Stint } from "@/lib/domain/types";
import { compoundColor } from "@/lib/utils/format";

interface LapRow { driverNumber: number; lapNumber: number; lapDuration: number | null; isPitOutLap: boolean }

/**
 * Tyre degradation per stint: recorded lap times only. Pit-in and pit-out
 * laps are excluded and the caption says so. No trend prediction, no model.
 */
export function DegradationPanel({
  drivers, stints, pitStops, laps,
}: {
  drivers: Driver[]; stints: Stint[]; pitStops: PitStop[]; laps: LapRow[];
}) {
  const [dn, setDn] = useState<number | null>(drivers[0]?.driverNumber ?? null);
  const driver = drivers.find((d) => d.driverNumber === dn) ?? drivers[0];

  const model = useMemo(() => {
    if (!driver) return null;
    const num = driver.driverNumber;
    const pitInLaps = new Set(pitStops.filter((p) => p.driverNumber === num).map((p) => p.lapNumber));
    const myStints = stints.filter((s) => s.driverNumber === num).sort((a, b) => a.stintNumber - b.stintNumber);
    const stintOf = (lap: number) => myStints.find((s) => lap >= s.lapStart && lap <= s.lapEnd) ?? null;
    const rows = laps
      .filter((l) => l.driverNumber === num && l.lapDuration != null && !l.isPitOutLap && !pitInLaps.has(l.lapNumber))
      .map((l) => ({ lap: l.lapNumber, t: l.lapDuration as number, stint: stintOf(l.lapNumber) }));
    if (rows.length < 3) return null;
    const ts = rows.map((r) => r.t);
    const min = Math.min(...ts), max = Math.max(...ts);
    const perStint = myStints.map((s) => {
      const rs = rows.filter((r) => r.lap >= s.lapStart && r.lap <= s.lapEnd);
      return {
        stint: s,
        rows: rs,
        best: rs.length ? Math.min(...rs.map((r) => r.t)) : null,
        drift: rs.length > 1 ? rs[rs.length - 1].t - rs[0].t : null,
      };
    }).filter((s) => s.rows.length > 0);
    return { rows, perStint, min, max, maxLap: Math.max(...rows.map((r) => r.lap)) };
  }, [driver, stints, pitStops, laps]);

  const fmt = (t: number) => {
    const m = Math.floor(t / 60), sec = (t - m * 60).toFixed(3).padStart(6, "0");
    return m > 0 ? `${m}:${sec}` : `${sec}`;
  };

  const W = 760, H = 260, PAD = { l: 46, r: 10, t: 12, b: 26 };
  const x = (lap: number) => model ? PAD.l + ((lap - 1) / Math.max(1, model.maxLap - 1)) * (W - PAD.l - PAD.r) : 0;
  const y = (t: number) => model ? PAD.t + (1 - (t - model.min) / Math.max(0.001, model.max - model.min)) * (H - PAD.t - PAD.b) : 0;

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-2.5">
        <span className="micro-label">Tyre degradation · recorded lap times</span>
        <select
          value={dn ?? undefined}
          onChange={(e) => setDn(Number(e.target.value))}
          className="h-8 border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs"
          aria-label="Driver for degradation view"
        >
          {drivers.map((d) => (
            <option key={d.driverNumber} value={d.driverNumber}>{d.acronym} — {d.fullName}</option>
          ))}
        </select>
      </div>
      {!model && (
        <div className="p-8 text-center text-sm text-[var(--ink-3)]">
          Not enough recorded laps for this driver in this session to show degradation.
        </div>
      )}
      {model && (
        <div className="p-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Lap time by lap number, coloured by stint compound">
            {[0, 0.5, 1].map((f) => {
              const t = model.min + f * (model.max - model.min);
              return (
                <g key={f}>
                  <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                  <text x={PAD.l - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="var(--ink-3)" fontFamily="var(--font-mono)">{fmt(t)}</text>
                </g>
              );
            })}
            {model.perStint.map(({ stint, rows }) => (
              <polyline
                key={stint.stintNumber}
                points={rows.map((r) => `${x(r.lap).toFixed(1)},${y(r.t).toFixed(1)}`).join(" ")}
                fill="none" stroke={compoundColor(stint.compound)} strokeWidth={1.8}
              />
            ))}
            {model.rows.map((r) => (
              <circle key={r.lap} cx={x(r.lap)} cy={y(r.t)} r={2.4}
                fill={r.stint ? compoundColor(r.stint.compound) : "var(--ink-3)"}>
                <title>{`Lap ${r.lap} · ${fmt(r.t)}${r.stint ? ` · ${r.stint.compound ?? "unknown"} stint ${r.stint.stintNumber}` : ""}`}</title>
              </circle>
            ))}
            {[1, Math.ceil(model.maxLap / 2), model.maxLap].map((lap) => (
              <text key={lap} x={x(lap)} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--ink-3)" fontFamily="var(--font-mono)">L{lap}</text>
            ))}
          </svg>
          <div className="mt-3 flex flex-wrap gap-2">
            {model.perStint.map(({ stint, rows, best, drift }) => (
              <div key={stint.stintNumber} className="border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5" style={{ background: compoundColor(stint.compound) }} />
                  <span className="micro-label">Stint {stint.stintNumber} · {stint.compound ?? "UNKNOWN"}</span>
                </div>
                <div className="mt-1 font-mono text-[11px] tnum text-[var(--ink-2)]">
                  {rows.length} laps · best {best != null ? fmt(best) : "—"} · first→last {drift != null ? `${drift >= 0 ? "+" : ""}${drift.toFixed(3)}s` : "—"}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-snug text-[var(--ink-3)]">
            Recorded lap times only. Pit-in and pit-out laps are excluded; safety-car
            or incident laps remain and may appear as spikes. The first-to-last
            figure is the raw difference between the first and last recorded lap of
            the stint — it is not a fitted trend and not a prediction.
          </p>
        </div>
      )}
    </div>
  );
}
