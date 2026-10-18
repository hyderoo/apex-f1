"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { fitTrack } from "@/lib/telemetry/track";
import {
  catmullRomClosedPath, formatRaceClock, positionAt, replayDuration, REPLAY_MAX_DRIVERS,
  type ReplayDriverTrack,
} from "@/lib/f1/replay";

interface RaceOption { sessionKey: number; label: string }
interface DriverMeta { driverNumber: number; acronym: string; fullName: string; teamColour: string | null }
interface ReplayData {
  t0: string;
  tracks: ReplayDriverTrack[];
  drivers: DriverMeta[];
  outline: [number, number][];
  unavailableDrivers: number[];
  note: string;
}

const SPEEDS = [1, 4, 16, 60, 240] as const;
const FALLBACK_COLOURS = ["#e10600", "#2f80ed", "#27ae60", "#f2994a", "#9b51e0", "#f2c94c", "#56ccf2", "#eb5757"];

function colourFor(d: DriverMeta | undefined, idx: number): string {
  if (d?.teamColour) return `#${d.teamColour.replace(/^#/, "")}`;
  return FALLBACK_COLOURS[idx % FALLBACK_COLOURS.length];
}

export function ReplayClient({ races }: { races: RaceOption[] }) {
  const [sessionKey, setSessionKey] = useState<number | null>(races[0]?.sessionKey ?? null);
  const [data, setData] = useState<ReplayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number[] | null>(null); // null = route default (top 5)
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(60);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);

  const duration = useMemo(() => (data ? replayDuration(data.tracks) : 0), [data]);
  const metaByNumber = useMemo(
    () => new Map((data?.drivers ?? []).map((d) => [d.driverNumber, d])),
    [data],
  );

  const load = useCallback(async (sk: number, drivers: number[] | null) => {
    setLoading(true); setError(null); setPlaying(false); setT(0);
    try {
      const qs = drivers && drivers.length > 0 ? `&drivers=${drivers.join(",")}` : "";
      const res = await fetch(`/api/replay?session=${sk}${qs}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setData(body);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Could not load replay data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionKey == null) return;
    // Deferred so the effect body stays free of synchronous setState.
    const id = setTimeout(() => load(sessionKey, selected), 0);
    return () => clearTimeout(id);
  }, [sessionKey, selected, load]);

  // rAF playback loop. Only runs while playing; t updates via the clock delta.
  useEffect(() => {
    if (!playing || duration <= 0) return;
    lastRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setT((prev) => {
        const next = prev + dt * speed;
        if (next >= duration) { setPlaying(false); return duration; }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed, duration]);

  // Track outline: one clean full-circuit lap, extracted and denoised
  // server-side from the densest driver's full-density recorded trace.
  const outline = data?.outline?.length ? data.outline : null;

  const projection = useMemo(() => {
    if (!outline) return null;
    return fitTrack(outline.map(([x, y]) => ({ x, y, z: 0, date: "", driverNumber: 0 })), 800, 600);
  }, [outline]);

  const outlinePath = useMemo(() => {
    if (!projection || !outline) return null;
    // Closed Catmull-Rom through the recorded (smoothed) points — the curve
    // interpolates recorded data, it does not invent geometry.
    return catmullRomClosedPath(outline.map(([x, y]) => projection.project(x, y)));
  }, [projection, outline]);

  const allDrivers = data?.drivers ?? [];
  const pickedSet = new Set(selected ?? data?.tracks.map((tr) => tr.driverNumber) ?? []);

  const toggleDriver = (dn: number) => {
    const cur = new Set(selected ?? data?.tracks.map((tr) => tr.driverNumber) ?? []);
    if (cur.has(dn)) cur.delete(dn);
    else if (cur.size < REPLAY_MAX_DRIVERS) cur.add(dn);
    setSelected([...cur]);
  };

  return (
    <div className="space-y-4 px-4 py-4 md:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="micro-label mr-2">Session</span>
          <select
            value={sessionKey ?? ""}
            onChange={(e) => { setSelected(null); setSessionKey(Number(e.target.value)); }}
            className="h-9 border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          >
            {races.map((r) => <option key={r.sessionKey} value={r.sessionKey}>{r.label}</option>)}
          </select>
        </label>
        <span className="micro-label">HISTORICAL · OpenF1</span>
      </div>

      {loading && (
        <div className="panel flex h-64 items-center justify-center p-6 text-xs text-[var(--ink-3)]">
          Loading recorded location data (one provider request per driver)…
        </div>
      )}

      {!loading && error && (
        <div className="panel p-6 text-center">
          <p className="text-sm text-[var(--ink-2)]">No replay available for this session.</p>
          <p className="mt-1 text-xs text-[var(--ink-3)]">{error}. Only sessions with recorded location data can be replayed.</p>
        </div>
      )}

      {!loading && data && (
        <>
          {allDrivers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="micro-label">Drivers</span>
              {allDrivers.map((d) => {
                const on = pickedSet.has(d.driverNumber);
                return (
                  <button
                    key={d.driverNumber}
                    onClick={() => toggleDriver(d.driverNumber)}
                    className={`border px-2 py-0.5 text-[11px] ${on
                      ? "border-[var(--accent)] bg-[var(--surface-2)] text-[var(--ink)]"
                      : "border-[var(--line)] text-[var(--ink-3)] hover:text-[var(--ink-2)]"}`}
                    title={d.fullName}
                  >
                    {d.acronym || d.driverNumber}
                  </button>
                );
              })}
              <span className="text-[10px] text-[var(--ink-3)]">up to {REPLAY_MAX_DRIVERS} — each is one provider request</span>
            </div>
          )}

          {data.unavailableDrivers.length > 0 && (
            <p className="text-xs text-[var(--ink-3)]">
              No recorded location data for: {data.unavailableDrivers.map((dn) => metaByNumber.get(dn)?.acronym ?? `#${dn}`).join(", ")} — hidden rather than guessed.
            </p>
          )}

          <div className="panel panel-ticks p-3">
            {projection && outlinePath ? (
              <svg viewBox={projection.viewBox} className="h-auto w-full" role="img" aria-label="Race replay">
                <path d={outlinePath} fill="none" stroke="var(--ink-3)" strokeWidth={2.5} strokeLinejoin="round" opacity={0.85} />
                {data.tracks.map((tr, i) => {
                  const pos = positionAt(tr.points, t);
                  if (!pos) return null; // outside this driver's recording — hidden, not clamped
                  const q = projection.project(pos.x, pos.y);
                  const meta = metaByNumber.get(tr.driverNumber);
                  const colour = colourFor(meta, i);
                  return (
                    <g key={tr.driverNumber}>
                      <circle cx={q.x} cy={q.y} r={7} fill={colour} stroke="#0b0c0f" strokeWidth={1.5} />
                      <text x={q.x + 10} y={q.y + 3.5} fontSize={10} fill="var(--ink)" fontFamily="var(--font-mono, monospace)">
                        {meta?.acronym ?? tr.driverNumber}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="flex h-64 items-center justify-center text-xs text-[var(--ink-3)]">
                No circuit geometry in the recorded data, so no map is drawn.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => { if (!playing && t >= duration) setT(0); setPlaying(!playing); }}
              disabled={duration === 0}
              className="flex items-center gap-1.5 bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {playing ? <Pause size={13} /> : <Play size={13} />} {playing ? "Pause" : "Play"}
            </button>
            <div className="flex items-center gap-1">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`border px-2 py-1 text-[11px] ${speed === s ? "border-[var(--accent)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--ink-3)]"}`}
                >
                  {s}×
                </button>
              ))}
            </div>
            <span className="font-mono text-sm tabular-nums text-[var(--ink)]">
              {formatRaceClock(t)} <span className="text-[var(--ink-3)]">/ {formatRaceClock(duration)}</span>
            </span>
          </div>
          <input
            type="range" min={0} max={Math.max(1, Math.floor(duration))} value={Math.floor(t)}
            onChange={(e) => setT(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
            aria-label="Replay position"
          />

          <p className="max-w-3xl text-xs leading-relaxed text-[var(--ink-3)]">{data.note}</p>
        </>
      )}
    </div>
  );
}
