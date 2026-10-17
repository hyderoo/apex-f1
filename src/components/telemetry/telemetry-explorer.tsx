"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { TelemetryChart, type ChannelPoint } from "./telemetry-chart";
import { TrackMap } from "./track-map";
import { DataStatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrefs } from "@/components/preferences";
import type { DataStatus } from "@/lib/domain/types";

interface SessionOption { sessionKey: number; label: string; date: string; type: string }
interface DriverOption { driverNumber: number; acronym: string; teamColour: string }

interface TelemetryResponse {
  drivers: Record<string, {
    points?: ChannelPoint[];
    metrics?: {
      maxSpeed: number | null; avgSpeed: number | null; fullThrottlePct: number | null;
      brakingZones: { startDistance: number; endDistance: number }[];
      gearChanges: { distance: number; from: number; to: number }[];
    };
    trackOutline?: { x: number; y: number }[];
    lapTime?: number | null;
    error?: string;
    demoNote?: string | null;
  }>;
  delta: { distance: number; delta: number }[];
  provenance: { status: DataStatus; provider: string; retrievedAt: string };
}

const ALL_CHANNELS = ["speed", "throttle", "brake", "gear", "rpm", "drs"];

export function TelemetryExplorer({
  sessions,
  drivers,
}: {
  sessions: SessionOption[];
  drivers: DriverOption[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const { prefs, update } = usePrefs();

  const sessionKey = Number(sp.get("session")) || sessions[0]?.sessionKey;
  const d1 = Number(sp.get("d1")) || drivers[0]?.driverNumber;
  const d2 = sp.get("d2") ? Number(sp.get("d2")) : null;
  const lap = Number(sp.get("lap")) || 5;
  const [lapInput, setLapInput] = useState(String(lap));

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (v == null) next.delete(k); else next.set(k, v);
    router.push(`/telemetry?${next.toString()}`);
  };

  const query = useQuery<TelemetryResponse>({
    queryKey: ["telemetry", sessionKey, lap, d1, d2],
    queryFn: async () => {
      const ds = [d1, d2].filter(Boolean).join(",");
      const res = await fetch(`/api/telemetry?session=${sessionKey}&lap=${lap}&drivers=${ds}`);
      if (!res.ok) throw new Error("telemetry request failed");
      return res.json();
    },
    enabled: Boolean(sessionKey && d1 && lap),
    placeholderData: keepPreviousData,
  });

  const d1Data = query.data?.drivers?.[String(d1)];
  const d2Data = d2 ? query.data?.drivers?.[String(d2)] : undefined;
  const outline = (d1Data?.trackOutline ?? d2Data?.trackOutline ?? []) as { x: number; y: number }[];
  const colorOf = (n: number) => `#${(drivers.find((d) => d.driverNumber === n)?.teamColour ?? "8a8f98").replace("#", "")}`;
  const acronymOf = (n: number) => drivers.find((d) => d.driverNumber === n)?.acronym ?? String(n);

  const maxLap = 80;

  return (
    <div className="px-4 py-4 md:px-6">
      {/* Selectors */}
      <div className="flex flex-wrap items-end gap-3 border-b border-[var(--line)] pb-4">
        <label className="block">
          <span className="micro-label">Grand Prix · Session</span>
          <select
            value={sessionKey}
            onChange={(e) => setParam("session", e.target.value)}
            className="mt-1 h-9 w-72 max-w-full border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          >
            {sessions.map((s) => (
              <option key={s.sessionKey} value={s.sessionKey}>
                {s.label} ({s.date})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="micro-label">Driver A</span>
          <select
            value={d1}
            onChange={(e) => setParam("d1", e.target.value)}
            className="mt-1 h-9 border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          >
            {drivers.map((d) => (
              <option key={d.driverNumber} value={d.driverNumber}>{d.acronym}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="micro-label">Driver B (optional)</span>
          <select
            value={d2 ?? ""}
            onChange={(e) => setParam("d2", e.target.value || null)}
            className="mt-1 h-9 border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          >
            <option value="">None</option>
            {drivers.filter((d) => d.driverNumber !== d1).map((d) => (
              <option key={d.driverNumber} value={d.driverNumber}>{d.acronym}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="micro-label">Lap</span>
          <div className="mt-1 flex items-center gap-1">
            <button
              onClick={() => { const v = Math.max(1, lap - 1); setParam("lap", String(v)); setLapInput(String(v)); }}
              className="h-9 w-8 border border-[var(--line)] text-sm hover:bg-[var(--surface-3)]"
              aria-label="Previous lap"
            >←</button>
            <input
              value={lapInput}
              onChange={(e) => setLapInput(e.target.value)}
              onBlur={() => {
                const v = Math.max(1, Math.min(maxLap, Number(lapInput) || 1));
                setParam("lap", String(v));
                setLapInput(String(v));
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") { const v = Math.max(1, lap - 1); setParam("lap", String(v)); setLapInput(String(v)); }
                if (e.key === "ArrowRight") { const v = lap + 1; setParam("lap", String(v)); setLapInput(String(v)); }
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="h-9 w-16 border border-[var(--line)] bg-[var(--surface-2)] text-center font-mono text-sm tnum"
            />
            <button
              onClick={() => { const v = lap + 1; setParam("lap", String(v)); setLapInput(String(v)); }}
              className="h-9 w-8 border border-[var(--line)] text-sm hover:bg-[var(--surface-3)]"
              aria-label="Next lap"
            >→</button>
          </div>
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {ALL_CHANNELS.map((c) => (
            <button
              key={c}
              onClick={() => {
                const has = prefs.telemetryChannels.includes(c);
                update({
                  telemetryChannels: has
                    ? prefs.telemetryChannels.filter((x) => x !== c)
                    : [...prefs.telemetryChannels, c],
                });
              }}
              className={`border px-2 py-1 text-[10px] uppercase tracking-wider ${
                prefs.telemetryChannels.includes(c)
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--line)] text-[var(--ink-3)]"
              }`}
            >
              {c}
            </button>
          ))}
          {query.data && <DataStatusBadge status={query.data.provenance.status} />}
        </div>
      </div>

      {/* Content */}
      {query.isPending && <Skeleton className="mt-4 h-96 w-full" />}
      {query.isError && (
        <div className="panel mt-4 p-6 text-sm text-[var(--ink-3)]">
          Telemetry could not be loaded for this selection. The provider may be
          rate-limiting; try again shortly.
        </div>
      )}
      {query.data && (
        <div className="mt-4 grid grid-cols-1 gap-px bg-[var(--line)] xl:grid-cols-3">
          <section className="panel xl:col-span-2">
            <div className="flex flex-wrap items-center gap-4 border-b border-[var(--line)] px-4 py-2 text-xs text-[var(--ink-3)]">
              <span>
                {acronymOf(d1)} lap {lap}
                {d1Data?.lapTime ? ` · ${d1Data.lapTime.toFixed(3)}s` : ""}
              </span>
              {d2 && (
                <span>
                  {acronymOf(d2)} lap {lap}
                  {d2Data?.lapTime ? ` · ${d2Data.lapTime.toFixed(3)}s` : ""}
                </span>
              )}
              <span className="ml-auto">{query.data.provenance.provider}</span>
            </div>
            {(d1Data?.points?.length ?? 0) > 0 ? (
              <TelemetryChart
                a={d1Data!.points!}
                b={d2Data?.points}
                aLabel={acronymOf(d1)}
                bLabel={d2 ? acronymOf(d2) : undefined}
                aColor={colorOf(d1)}
                bColor={d2 ? colorOf(d2) : undefined}
                delta={query.data.delta.length ? query.data.delta : undefined}
              />
            ) : (
              <div className="p-8 text-center text-sm text-[var(--ink-3)]">
                {d1Data?.error ?? d1Data?.demoNote ??
                  "No recorded telemetry for this driver and lap. Try a different lap or session."}
              </div>
            )}
          </section>
          <div className="flex flex-col gap-px bg-[var(--line)]">
            <section className="panel">
              <div className="border-b border-[var(--line)] px-4 py-2.5">
                <span className="micro-label">Circuit map · speed trace</span>
              </div>
              <div className="p-3">
                <TrackMap
                  outline={outline}
                  speedColor
                  samples={(d1Data?.points ?? [])
                    .filter((p) => p.distance != null)
                    .map((p, i) => ({
                      x: outline[Math.min(outline.length - 1, Math.floor((i / Math.max(1, (d1Data?.points?.length ?? 1) - 1)) * (outline.length - 1)))]?.x ?? 0,
                      y: outline[Math.min(outline.length - 1, Math.floor((i / Math.max(1, (d1Data?.points?.length ?? 1) - 1)) * (outline.length - 1)))]?.y ?? 0,
                      speed: p.speed,
                    }))}
                />
                <p className="mt-2 text-[10px] leading-snug text-[var(--ink-3)]">
                  Outline from recorded GPS points of this lap. Sector boundaries
                  and corner numbers are shown only when reliable data exists.
                </p>
              </div>
            </section>
            <section className="panel">
              <div className="border-b border-[var(--line)] px-4 py-2.5">
                <span className="micro-label">Derived metrics</span>
              </div>
              <div className="grid grid-cols-2 gap-px bg-[var(--line)]">
                {[d1, d2].filter(Boolean).map((dn) => {
                  const m = query.data.drivers[String(dn!)]?.metrics;
                  return (
                    <div key={dn} className="bg-[var(--surface-2)] p-3">
                      <div className="mb-1 font-mono text-xs font-semibold" style={{ color: colorOf(dn!) }}>
                        {acronymOf(dn!)}
                      </div>
                      {m ? (
                        <dl className="space-y-0.5 text-[11px]">
                          <div className="flex justify-between"><dt className="text-[var(--ink-3)]">Max speed</dt><dd className="font-mono tnum">{m.maxSpeed?.toFixed(0) ?? "—"} km/h</dd></div>
                          <div className="flex justify-between"><dt className="text-[var(--ink-3)]">Avg speed</dt><dd className="font-mono tnum">{m.avgSpeed?.toFixed(0) ?? "—"} km/h</dd></div>
                          <div className="flex justify-between"><dt className="text-[var(--ink-3)]">Full throttle</dt><dd className="font-mono tnum">{m.fullThrottlePct?.toFixed(0) ?? "—"}%</dd></div>
                          <div className="flex justify-between"><dt className="text-[var(--ink-3)]">Braking zones</dt><dd className="font-mono tnum">{m.brakingZones.length}</dd></div>
                          <div className="flex justify-between"><dt className="text-[var(--ink-3)]">Gear changes</dt><dd className="font-mono tnum">{m.gearChanges.length}</dd></div>
                        </dl>
                      ) : (
                        <p className="text-[11px] text-[var(--ink-3)]">No data</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="px-3 py-2 text-[10px] leading-snug text-[var(--ink-3)]">
                Brake is a boolean pedal signal, not pressure. Full throttle =
                share of samples ≥98%. Distances are interpolated from recorded
                GPS points.
              </p>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
