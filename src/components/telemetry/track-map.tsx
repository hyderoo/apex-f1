"use client";

import { useEffect, useMemo, useState } from "react";
import { fitTrack } from "@/lib/telemetry/track";

interface OutlinePoint { x: number; y: number }

/**
 * Circuit outline from recorded location points. If no geometry is available
 * the caller renders an informative fallback instead of a fake map.
 */
export function TrackMap({
  outline,
  markers,
  speedColor = false,
  samples,
}: {
  outline: OutlinePoint[];
  markers?: { x: number; y: number; color: string; label: string }[];
  speedColor?: boolean;
  samples?: { x: number; y: number; speed: number | null }[];
}) {
  const projection = useMemo(() => fitTrack(outline.map((o) => ({ ...o, z: 0, date: "", driverNumber: 0 })), 800, 600), [outline]);
  if (!projection || outline.length < 3) {
    return (
      <div className="panel flex h-64 items-center justify-center p-6 text-center text-xs text-[var(--ink-3)]">
        No circuit geometry is available for this session. The provider did not
        record location data here, so no track map is shown rather than a fake one.
      </div>
    );
  }
  const path = outline
    .map((p, i) => {
      const q = projection.project(p.x, p.y);
      return `${i === 0 ? "M" : "L"}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
    })
    .join(" ") + " Z";

  let maxSpeed = 0;
  if (speedColor && samples) {
    for (const s of samples) if (s.speed && s.speed > maxSpeed) maxSpeed = s.speed;
  }

  return (
    <svg viewBox={projection.viewBox} className="h-auto w-full" role="img" aria-label="Circuit map">
      <path d={path} fill="none" stroke="var(--ink-3)" strokeWidth={2.5} strokeLinejoin="round" opacity={speedColor ? 0.25 : 0.9} />
      {speedColor && samples && maxSpeed > 0 &&
        samples.map((s, i) => {
          if (i === 0) return null;
          const p0 = projection.project(samples[i - 1].x, samples[i - 1].y);
          const p1 = projection.project(s.x, s.y);
          const v = s.speed ?? 0;
          const t = Math.min(1, v / maxSpeed);
          const color = `rgb(${Math.round(255 * t)},${Math.round(60 + 120 * (1 - t))},${Math.round(80 * (1 - t))})`;
          return (
            <line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={color} strokeWidth={2.5} />
          );
        })}
      {outline[0] && (() => {
        const s = projection.project(outline[0].x, outline[0].y);
        return (
          <g>
            <line x1={s.x - 6} y1={s.y - 6} x2={s.x + 6} y2={s.y + 6} stroke="var(--ink)" strokeWidth={2} />
            <line x1={s.x - 6} y1={s.y + 6} x2={s.x + 6} y2={s.y - 6} stroke="var(--ink)" strokeWidth={2} />
            <text x={s.x + 10} y={s.y + 4} fill="var(--ink-3)" fontSize={10}>Start/Finish</text>
          </g>
        );
      })()}
      {(markers ?? []).map((m, i) => {
        const q = projection.project(m.x, m.y);
        return (
          <g key={i}>
            <circle cx={q.x} cy={q.y} r={7} fill={m.color} stroke="var(--surface)" strokeWidth={2} />
            <text x={q.x} y={q.y + 3.5} textAnchor="middle" fontSize={8} fontWeight={700} fill="#0b0c0f">
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Historical replay: interpolate only between recorded points. */
export function useReplay(points: { t: number; x: number; y: number }[], speed = 8) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing || points.length < 2) return;
    const id = setInterval(() => setIdx((i) => Math.min(points.length - 1, i + speed)), 100);
    return () => clearInterval(id);
  }, [playing, points.length, speed]);
  return { idx, playing, setPlaying, setIdx };
}
