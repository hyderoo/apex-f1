"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TelemetryChart, type ChannelPoint } from "./telemetry-chart";
import { TrackMap } from "./track-map";
import { DataStatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrefs } from "@/components/preferences";
import type { DataStatus } from "@/lib/domain/types";
import { DriverAvatar } from "@/components/identity/driver-identity";

interface SessionOption { sessionKey: number; label: string; date: string; type: string }
interface DriverOption { driverNumber: number; acronym: string; teamColour: string; headshotUrl?: string | null }

interface TelemetryResponse {
  drivers: Record<string, {
    points?: ChannelPoint[];
    metrics?: {
      maxSpeed: number | null; avgSpeed: number | null; fullThrottlePct: number | null;
      brakingZones: { startDistance: number; endDistance: number }[];
      gearChanges: { distance: number; from: number; to: number }[];
    };
    trackOutline?: { x: number; y: number; t?: number }[];
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
      const data = (await res.json()) as TelemetryResponse;
      // Flag sessions that provably have no recorded telemetry (laps exist,
      // car/location channels empty) so the picker can label them honestly.
      if (data.provenance?.status !== "unavailable") {
        const empty = (x?: { points?: unknown[]; error?: string }) =>
          x && !x.error && (x.points?.length ?? 0) === 0;
        if (empty(data.drivers?.[String(d1)]) && (!d2 || empty(data.drivers?.[String(d2)]))) {
          setNoTelemetrySessions((prev) => (prev.has(sessionKey) ? prev : new Set(prev).add(sessionKey)));
        }
      }
      return data;
    },
    enabled: Boolean(sessionKey && d1 && lap),
    placeholderData: keepPreviousData,
  });

  const d1Data = query.data?.drivers?.[String(d1)];
  const d2Data = d2 ? query.data?.drivers?.[String(d2)] : undefined;
  const [noTelemetrySessions, setNoTelemetrySessions] = useState<Set<number>>(new Set());
  const outline = (d1Data?.trackOutline ?? d2Data?.trackOutline ?? []) as { x: number; y: number; t?: number }[];
  const replayDrivers = [d1, d2]
    .filter((n): n is number => n != null)
    .map((n) => ({ n, pts: (query.data?.drivers?.[String(n)]?.trackOutline ?? []).filter((p) => p.t != null) as { t: number; x: number; y: number; distance?: number }[] }))
    .filter((d) => d.pts.length > 10);
  const colorOf = (n: number) => `#${(drivers.find((d) => d.driverNumber === n)?.teamColour ?? "8a8f98").replace("#", "")}`;
  const acronymOf = (n: number) => drivers.find((d) => d.driverNumber === n)?.acronym ?? String(n);
  const driverOf = (n: number | null) => drivers.find((d) => d.driverNumber === n) ?? null;
  const selA = driverOf(d1);
  const selB = d2 != null ? driverOf(d2) : null;

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
                {s.label} ({s.date}){noTelemetrySessions.has(s.sessionKey) ? " — no telemetry recorded" : ""}
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
        <div className="flex items-end gap-2 pb-0.5">
          {selA && <DriverAvatar src={selA.headshotUrl} acronym={selA.acronym} teamColour={selA.teamColour} size={28} />}
          {selB && <DriverAvatar src={selB.headshotUrl} acronym={selB.acronym} teamColour={selB.teamColour} size={28} />}
        </div>
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
                {d1Data?.error === "unavailable"
                  ? "Telemetry is temporarily unavailable from the provider (rate limited). Try again in a minute."
                  : d1Data?.demoNote ?? d1Data?.error ??
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
            {replayDrivers.length > 0 && (
              <section className="panel">
                <div className="border-b border-[var(--line)] px-4 py-2.5">
                  <span className="micro-label">Lap replay · recorded positions</span>
                </div>
                <div className="p-3">
                  <LapReplay
                    drivers={replayDrivers.map((d) => ({ points: d.pts, color: colorOf(d.n), label: acronymOf(d.n) }))}
                    delta={query.data?.delta?.length ? query.data.delta : undefined}
                  />
                  <p className="mt-2 text-[10px] leading-snug text-[var(--ink-3)]">
                    Markers interpolate only between recorded GPS points of this
                    lap. Playback is time-synced across drivers; it is not a
                    simulation.
                  </p>
                </div>
              </section>
            )}
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

/** Position of a driver at time t, linearly interpolated between recorded points. */
function posAt(points: { t: number; x: number; y: number; distance?: number }[], t: number) {
  if (t <= points[0].t) return points[0];
  const last = points[points.length - 1];
  if (t >= last.t) return last;
  let lo = 0, hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t <= t) lo = mid; else hi = mid;
  }
  const a = points[lo], b = points[hi];
  const f = (t - a.t) / Math.max(1, b.t - a.t);
  return {
    t,
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    distance: a.distance != null && b.distance != null ? a.distance + (b.distance - a.distance) * f : undefined,
  };
}

function LapReplay({ drivers, delta }: { drivers: { points: { t: number; x: number; y: number; distance?: number }[]; color: string; label: string }[]; delta?: { distance: number; delta: number }[] }) {
  const maxT = Math.max(...drivers.map((d) => d.points[d.points.length - 1].t));
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(20);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT((cur) => {
        const next = cur + speed * 100;
        if (next >= maxT) { setPlaying(false); return maxT; }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, speed, maxT]);

  const outline = drivers[0].points;
  const markers = drivers.map((d) => {
    const p = posAt(d.points, Math.min(t, d.points[d.points.length - 1].t));
    return { x: p.x, y: p.y, color: d.color, label: d.label };
  });

  // Live delta readout: gap at the second driver's current distance,
  // interpolated from the recorded delta series (positive = B slower there).
  let deltaReadout: string | null = null;
  if (delta && delta.length > 1 && drivers.length > 1) {
    const pts = drivers[1].points;
    const p = posAt(pts, Math.min(t, pts[pts.length - 1].t));
    if (p.distance != null) {
      let lo = 0, hi = delta.length - 1;
      if (p.distance <= delta[0].distance) lo = hi = 0;
      else if (p.distance >= delta[hi].distance) lo = hi;
      else {
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (delta[mid].distance <= p.distance) lo = mid; else hi = mid;
        }
      }
      const a = delta[lo], b = delta[hi];
      const f = b.distance > a.distance ? (p.distance - a.distance) / (b.distance - a.distance) : 0;
      const gap = a.delta + (b.delta - a.delta) * f;
      const ahead = gap >= 0 ? drivers[0].label : drivers[1].label;
      deltaReadout = `${ahead} ahead by ${Math.abs(gap).toFixed(3)}s`;
    }
  }
  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}.${String(Math.floor((ms % 1000) / 100))}`;

  return (
    <div>
      <TrackMap outline={outline} markers={markers} />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => { if (!playing && t >= maxT) setT(0); setPlaying(!playing); }}
          className="border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-[11px] uppercase tracking-wider hover:text-[var(--accent)]"
          aria-label={playing ? "Pause replay" : "Play replay"}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range" min={0} max={maxT} value={t} step={50}
          onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }}
          className="h-1 flex-1 cursor-pointer accent-[var(--accent)]"
          aria-label="Replay position"
        />
        <span className="font-mono text-[11px] tnum text-[var(--ink-2)]">{fmt(t)} / {fmt(maxT)}</span>
        {deltaReadout && (
          <span
            className="whitespace-nowrap border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[11px] tnum text-[var(--accent)]"
            title="Gap at the second driver's current track position, interpolated from recorded lap timing"
          >
            Δ {deltaReadout}
          </span>
        )}
        <select
          value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
          className="border border-[var(--line)] bg-[var(--surface-2)] px-1 py-0.5 text-[11px]"
          aria-label="Replay speed"
        >
          {[5, 10, 20, 40].map((v) => <option key={v} value={v}>{v}×</option>)}
        </select>
      </div>
    </div>
  );
}
