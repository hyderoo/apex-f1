"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CopyLinkButton } from "@/components/ui/copy-link";
import type { DataStatus, Driver, PitStop, Stint } from "@/lib/domain/types";
import { compoundColor, formatDuration } from "@/lib/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import { DataStatusBadge } from "@/components/ui/badge";
import { Term } from "@/components/ui/tooltip-term";
import { DriverAvatar } from "@/components/identity/driver-identity";
import { DegradationPanel } from "@/components/timing/degradation-panel";
import { UndercutPanel } from "@/components/timing/undercut-panel";
import { DragScroll } from "@/components/ui/drag-scroll";

interface StrategyResponse {
  drivers: Driver[];
  stints: Stint[];
  pitStops: PitStop[];
  laps: { driverNumber: number; lapNumber: number; lapDuration: number | null; isPitOutLap: boolean }[];
  lapCount: number;
  provenance: { status: DataStatus; provider: string; retrievedAt: string };
}

export function StrategyClient({ races }: { races: { sessionKey: number; label: string }[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const fromUrl = Number(sp.get("session"));
  const [sessionKey, setSessionKey] = useState(
    races.some((r) => r.sessionKey === fromUrl) ? fromUrl : races[0]?.sessionKey,
  );
  const pick = (key: number) => {
    setSessionKey(key);
    router.replace(`/strategy?session=${key}`);
  };
  const { data, isPending } = useQuery<StrategyResponse>({
    queryKey: ["strategy", sessionKey],
    queryFn: async () => {
      const res = await fetch(`/api/strategy?session=${sessionKey}`);
      if (!res.ok) throw new Error("strategy failed");
      return res.json();
    },
    enabled: sessionKey != null,
  });

  if (races.length === 0) {
    return <div className="p-6 text-sm text-[var(--ink-3)]">No completed races yet this season.</div>;
  }

  return (
    <div className="px-4 py-4 md:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={sessionKey}
          onChange={(e) => pick(Number(e.target.value))}
          className="h-9 w-80 max-w-full border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
        >
          {races.map((r) => (
            <option key={r.sessionKey} value={r.sessionKey}>{r.label}</option>
          ))}
        </select>
        {data && <DataStatusBadge status={data.provenance.status} />}
        <CopyLinkButton />
      </div>

      {isPending && <Skeleton className="h-96 w-full" />}
      {data && (
        <div className="flex flex-col gap-px bg-[var(--line)]">
        <div className="panel">
          <div className="border-b border-[var(--line)] px-4 py-2.5">
            <span className="micro-label">
              <Term>Stint</Term> timeline · {data.lapCount} laps
            </span>
          </div>
          <DragScroll>
            <div className="min-w-[700px] px-4 py-2">
              {data.drivers
                .slice()
                .sort((a, b) => a.driverNumber - b.driverNumber)
                .map((d) => {
                  const stints = data.stints
                    .filter((s) => s.driverNumber === d.driverNumber)
                    .sort((a, b) => a.stintNumber - b.stintNumber);
                  const pits = data.pitStops.filter((p) => p.driverNumber === d.driverNumber);
                  return (
                    <div key={d.driverNumber} className="flex items-center gap-2 border-b border-[var(--line)] py-1.5">
                      <div className="flex w-16 shrink-0 items-center gap-1.5 font-mono text-xs font-semibold">
                        <DriverAvatar src={d.headshotUrl} acronym={d.acronym} teamColour={d.teamColour} size={18} />
                        {d.acronym}
                      </div>
                      <div className="relative h-5 flex-1">
                        {stints.map((s) => {
                          const width = ((s.lapEnd - s.lapStart + 1) / data.lapCount) * 100;
                          const left = ((s.lapStart - 1) / data.lapCount) * 100;
                          return (
                            <div
                              key={s.stintNumber}
                              className="absolute top-0 flex h-5 items-center justify-center border border-black/20"
                              style={{
                                left: `${left}%`,
                                width: `${width}%`,
                                background: compoundColor(s.compound),
                              }}
                              title={`${s.compound ?? "UNKNOWN"} · laps ${s.lapStart}–${s.lapEnd} · age at start ${s.tyreAgeAtStart}`}
                            >
                              {width > 6 && (
                                <span className="font-mono text-[9px] font-bold text-black/70">
                                  {(s.compound ?? "?").slice(0, 1)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {pits.map((p, i) => (
                          <div
                            key={i}
                            className="absolute top-0 h-5 w-[2px] bg-[var(--ink)]"
                            style={{ left: `${(p.lapNumber / data.lapCount) * 100}%` }}
                            title={`Pit · lap ${p.lapNumber}${p.pitDuration != null ? ` · ${formatDuration(p.pitDuration)}` : ""}`}
                          />
                        ))}
                      </div>
                      <div className="w-16 shrink-0 text-right font-mono text-[10px] text-[var(--ink-3)] tnum">
                        {pits.length > 0 ? `${pits.length} stop${pits.length > 1 ? "s" : ""}` : "—"}
                      </div>
                    </div>
                  );
                })}
              <div className="mt-3 flex flex-wrap gap-3 pb-2">
                {["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"].map((c) => (
                  <span key={c} className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                    <span className="inline-block h-3 w-3 border border-black/30" style={{ background: compoundColor(c) }} />
                    {c}
                  </span>
                ))}
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                  <span className="inline-block h-3 w-[2px] bg-[var(--ink)]" /> Pit stop
                </span>
              </div>
            </div>
          </DragScroll>
          <div className="border-t border-[var(--line)] px-4 py-2 text-[10px] text-[var(--ink-3)]">
            Observed provider records only. Pit wall lines mark the recorded pit lap; hover for duration.
          </div>
        </div>
        <DegradationPanel drivers={data.drivers} stints={data.stints} pitStops={data.pitStops} laps={data.laps} />
        <UndercutPanel drivers={data.drivers} pitStops={data.pitStops} laps={data.laps} />
        </div>
      )}
    </div>
  );
}
