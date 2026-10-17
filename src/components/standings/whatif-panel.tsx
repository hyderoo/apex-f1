"use client";

import { useMemo, useState } from "react";
import { projectChampionship, type WhatIfDriver } from "@/lib/f1/whatif";

/**
 * Championship what-if calculator. A SIMULATION with stated assumptions —
 * never presented as a prediction.
 */
export function WhatIfPanel({
  standings, remainingRaces, remainingSprints, roundsCompleted,
}: {
  standings: WhatIfDriver[];
  remainingRaces: number;
  remainingSprints: number;
  roundsCompleted: number;
}) {
  const [driverId, setDriverId] = useState<string>(standings[0]?.driverId ?? "");
  const [position, setPosition] = useState(1);

  const rows = useMemo(
    () => driverId
      ? projectChampionship({ standings, chosenDriverId: driverId, assumedPosition: position, remainingRaces, remainingSprints, roundsCompleted })
      : [],
    [standings, driverId, position, remainingRaces, remainingSprints, roundsCompleted],
  );
  const chosen = standings.find((d) => d.driverId === driverId);

  if (remainingRaces + remainingSprints === 0 || standings.length === 0) return null;

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-2.5">
        <span className="micro-label">Championship what-if</span>
        <span className="border border-[var(--accent)] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
          Simulation
        </span>
      </div>
      <div className="px-4 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="micro-label">Driver</span>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="mt-1 h-9 border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
            >
              {standings.map((d) => (
                <option key={d.driverId} value={d.driverId}>{d.familyName}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="micro-label">Finishes every remaining race</span>
            <select
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              className="mt-1 h-9 border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
            >
              {Array.from({ length: 20 }, (_, i) => (
                <option key={i + 1} value={i + 1}>P{i + 1}</option>
              ))}
            </select>
          </label>
          <span className="pb-2 text-[11px] text-[var(--ink-3)]">
            {remainingRaces} race{remainingRaces !== 1 ? "s" : ""}
            {remainingSprints > 0 ? ` + ${remainingSprints} sprint${remainingSprints !== 1 ? "s" : ""}` : ""} left
          </span>
        </div>

        <div className="mt-4 border border-[var(--line)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--line)] text-left">
                <th className="px-3 py-2 micro-label font-normal">Proj. P</th>
                <th className="px-3 py-2 micro-label font-normal">Driver</th>
                <th className="px-3 py-2 micro-label font-normal text-right">Proj. points</th>
                <th className="px-3 py-2 micro-label font-normal text-right">Move</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((r) => (
                <tr key={r.driverId} className={`timing-row ${r.isChosen ? "text-[var(--accent)]" : ""}`}>
                  <td className="px-3 py-1.5 font-mono text-sm tnum">{r.projectedPosition}</td>
                  <td className="px-3 py-1.5 text-sm">
                    {r.familyName}{r.isChosen ? " •" : ""}
                    <span className="ml-2 text-[10px] text-[var(--ink-3)]">now P{r.position}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-sm font-bold tnum">{r.projectedPoints}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-xs tnum">
                    {r.positionDelta > 0 ? `▲${r.positionDelta}` : r.positionDelta < 0 ? `▼${-r.positionDelta}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-[var(--ink-3)]">
          Simulation, not a prediction. {chosen?.familyName ?? "The chosen driver"} scores P{position} points
          in every remaining race{sprintNote(remainingSprints)}; every other driver keeps scoring at their
          season average (current points ÷ {roundsCompleted} completed rounds). Fastest-lap points, DNFs,
          penalties and tie-breaks are not modelled. Current standings are real Jolpica data.
        </p>
      </div>
    </div>
  );
}

function sprintNote(n: number) {
  return n > 0 ? " (sprint scale in sprints)" : "";
}
