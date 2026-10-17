"use client";

import { useMemo, useState } from "react";
import type { Driver, PitStop } from "@/lib/domain/types";
import { analyzeUndercut } from "@/lib/f1/undercut";
import { formatDuration } from "@/lib/utils/format";
import { DriverAvatar } from "@/components/identity/driver-identity";

interface LapRow { driverNumber: number; lapNumber: number; lapDuration: number | null; isPitOutLap: boolean }

const fmt = (v: number | null) => (v === null ? "—" : formatDuration(v));
const fmtDelta = (v: number | null) =>
  v === null ? "—" : `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(3)}s`;

/**
 * Pit stop + undercut analyzer. Compares two drivers' first recorded stops
 * using cumulative recorded race time (sum of real lap durations — the pit
 * lap's duration already includes the stop). No simulation.
 */
export function UndercutPanel({
  drivers, pitStops, laps,
}: {
  drivers: Driver[]; pitStops: PitStop[]; laps: LapRow[];
}) {
  const pitters = useMemo(
    () => drivers.filter((d) => pitStops.some((p) => p.driverNumber === d.driverNumber)),
    [drivers, pitStops],
  );
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const dnA = a ?? pitters[0]?.driverNumber ?? null;
  const dnB = b ?? pitters.find((d) => d.driverNumber !== dnA)?.driverNumber ?? null;

  const result = useMemo(
    () => (dnA !== null && dnB !== null && dnA !== dnB
      ? analyzeUndercut(dnA, dnB, laps, pitStops)
      : null),
    [dnA, dnB, laps, pitStops],
  );

  const drv = (dn: number | null) => drivers.find((d) => d.driverNumber === dn) ?? null;
  const dA = drv(result?.driverA ?? dnA);
  const dB = drv(result?.driverB ?? dnB);

  if (pitters.length < 2) {
    return (
      <div className="panel">
        <div className="border-b border-[var(--line)] px-4 py-2.5 micro-label">Pit stop + undercut analyzer</div>
        <div className="px-4 py-6 text-sm text-[var(--ink-3)]">
          Fewer than two recorded pit stops in this session — nothing to compare.
        </div>
      </div>
    );
  }

  const sel = (value: number | null, onChange: (v: number) => void, exclude: number | null) => (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-9 border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
    >
      {pitters.filter((d) => d.driverNumber !== exclude).map((d) => (
        <option key={d.driverNumber} value={d.driverNumber}>{d.acronym} — {d.fullName}</option>
      ))}
    </select>
  );

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-2.5">
        <span className="micro-label">Pit stop + undercut analyzer</span>
        <div className="flex items-center gap-2">
          {sel(dnA, setA, dnB)}
          <span className="text-[10px] uppercase tracking-wider text-[var(--ink-3)]">vs</span>
          {sel(dnB, setB, dnA)}
        </div>
      </div>

      {result && dA && dB ? (
        <div className="px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
              result.strategy === "undercut"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-[var(--line)] text-[var(--ink-2)]"
            }`}>
              {result.strategy === "same-lap" ? "Same-lap stops" : `${dA.acronym} ${result.strategy} attempt`}
            </span>
            {result.positionsSwapped === true && (
              <span className="border border-[var(--line)] px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--ink-2)]">
                Order swapped in window
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
            {[
              { d: dA, w: result.windowA, tag: result.firstToPit === "A" ? "Pitted first" : null },
              { d: dB, w: result.windowB, tag: result.firstToPit === "B" ? "Pitted first" : null },
            ].map(({ d, w, tag }) => (
              <div key={d.driverNumber} className="bg-[var(--surface)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <DriverAvatar src={d.headshotUrl} acronym={d.acronym} teamColour={d.teamColour} size={24} />
                  <span className="text-sm font-bold">{d.fullName}</span>
                  {tag && <span className="text-[10px] uppercase tracking-wider text-[var(--accent)]">{tag}</span>}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs tnum">
                  <dt className="text-[var(--ink-3)]">Pit lap</dt><dd className="text-right">L{w.pitLap}</dd>
                  <dt className="text-[var(--ink-3)]">In-lap</dt><dd className="text-right">{fmt(w.inLap)}</dd>
                  <dt className="text-[var(--ink-3)]">Stop lap</dt><dd className="text-right">{fmt(w.stopLap)}</dd>
                  <dt className="text-[var(--ink-3)]">Out-lap</dt><dd className="text-right">{fmt(w.outLap)}</dd>
                  <dt className="text-[var(--ink-3)]">Recorded stop</dt><dd className="text-right">{fmt(w.pitDuration)}</dd>
                </dl>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-px border border-[var(--line)] bg-[var(--line)] text-center">
            {[
              { label: `Gap before window${result.referenceLaps.before ? ` · L${result.referenceLaps.before}` : ""}`, value: fmtDelta(result.deltaBefore) },
              { label: `Gap after window${result.referenceLaps.after ? ` · L${result.referenceLaps.after}` : ""}`, value: fmtDelta(result.deltaAfter) },
              { label: `Net for ${dA.acronym}`, value: fmtDelta(result.netGainA) },
            ].map((c) => (
              <div key={c.label} className="bg-[var(--surface)] px-2 py-3">
                <div className="font-mono text-lg font-bold tnum">{c.value}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--ink-3)]">{c.label}</div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-[var(--ink-3)]">
            Gap = {dB.acronym} minus {dA.acronym} cumulative recorded race time (sum of real lap
            durations; the pit lap already includes the stop). Positive net = {dA.acronym} gained.
            Traffic and safety-car effects are not modelled — this is a stopwatch comparison of
            recorded laps, not a simulation. First recorded stop per driver.
          </p>
        </div>
      ) : (
        <div className="px-4 py-6 text-sm text-[var(--ink-3)]">
          No recorded pit stop for one of these drivers in this session.
        </div>
      )}
    </div>
  );
}
