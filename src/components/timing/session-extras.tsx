"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";
import type {
  Driver, Envelope, GridSlot, Overtake, SessionResultEntry, TeamRadioClip,
} from "@/lib/domain/types";
import { DataStatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatGap, formatLapTime } from "@/lib/utils/format";

interface ExtrasResponse {
  result: Envelope<SessionResultEntry[]>;
  grid: Envelope<GridSlot[]> & { source: "starting_grid" | "qualifying" | "none" };
  overtakes: Envelope<Overtake[]>;
  teamRadio: Envelope<TeamRadioClip[]>;
  drivers: Driver[];
}

export function SessionExtras({ sessionKey }: { sessionKey?: number }) {
  // Defer the extras fetch so the leaderboard (the primary panel) gets the
  // provider rate-limited budget first on a cold cache.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 3500);
    return () => clearTimeout(id);
  }, []);
  const query = useQuery<ExtrasResponse>({
    queryKey: ["session-extras", sessionKey],
    queryFn: async () => {
      const res = await fetch(`/api/session-extras?session=${sessionKey}`);
      if (!res.ok) throw new Error("session extras request failed");
      return res.json();
    },
    enabled: sessionKey != null && ready,
  });

  if (!sessionKey) return null;
  if (!ready || query.isLoading) {
    return <div className="grid grid-cols-1 gap-px bg-[var(--line)] p-px md:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>;
  }
  if (query.isError || !query.data) {
    return (
      <div className="panel p-6 text-center text-xs text-[var(--ink-3)]">
        Classification, grid, overtakes and radio are unavailable for this session right now.
      </div>
    );
  }

  const d = query.data;
  const acr = new Map(d.drivers.map((x) => [x.driverNumber, x.acronym]));
  const col = new Map(d.drivers.map((x) => [x.driverNumber, x.teamColour]));
  const name = (n: number) => acr.get(n) ?? `#${n}`;
  const color = (n: number) => `#${(col.get(n) ?? "8a8f98").replace("#", "")}`;
  const status = d.result.provenance.status;

  return (
    <div className="grid grid-cols-1 gap-px bg-[var(--line)] md:grid-cols-2">
      {/* Official classification */}
      <section className="panel">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
          <span className="micro-label">Official classification</span>
          <DataStatusBadge status={status} />
        </div>
        {(d.result.data?.length ?? 0) === 0 ? (
          <p className="p-4 text-xs text-[var(--ink-3)]">No published classification for this session yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                <th className="px-4 py-1.5 font-medium">P</th>
                <th className="py-1.5 font-medium">Driver</th>
                <th className="py-1.5 font-medium text-right">Laps</th>
                <th className="py-1.5 font-medium text-right">Gap</th>
                <th className="py-1.5 pr-4 font-medium text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {d.result.data!.map((r) => (
                <tr key={r.driverNumber} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-1 font-mono tnum">{r.dsq ? "DSQ" : r.dnf ? "DNF" : r.dns ? "DNS" : r.position}</td>
                  <td className="py-1 font-mono font-semibold" style={{ color: color(r.driverNumber) }}>{name(r.driverNumber)}</td>
                  <td className="py-1 text-right font-mono tnum text-[var(--ink-2)]">{r.numberOfLaps ?? "—"}</td>
                  <td className="py-1 text-right font-mono tnum text-[var(--ink-2)]">
                    {r.position === 1 ? formatLapTime(r.duration) : formatGap(r.gapToLeader)}
                  </td>
                  <td className="py-1 pr-4 text-right font-mono tnum">{r.points ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Starting grid */}
      <section className="panel">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
          <span className="micro-label">
            Starting grid{d.grid.source === "qualifying" ? " · from qualifying" : ""}
          </span>
          <DataStatusBadge status={d.grid.provenance.status} />
        </div>
        {(d.grid.data?.length ?? 0) === 0 ? (
          <p className="p-4 text-xs text-[var(--ink-3)]">
            No grid published by the provider for this session.
          </p>
        ) : (
          <ol className="grid grid-cols-2 gap-x-4 px-4 py-2">
            {d.grid.data!.map((g) => (
              <li key={g.driverNumber} className="flex items-baseline gap-2 border-b border-[var(--line)] py-1 text-xs last:border-0">
                <span className="w-5 font-mono tnum text-[var(--ink-3)]">{g.position}</span>
                <span className="font-mono font-semibold" style={{ color: color(g.driverNumber) }}>{name(g.driverNumber)}</span>
              </li>
            ))}
          </ol>
        )}
        {d.grid.source === "qualifying" && (
          <p className="px-4 pb-2 text-[10px] text-[var(--ink-3)]">
            The provider has not published starting-grid data for this session; the
            qualifying classification is shown instead, which usually matches the grid.
          </p>
        )}
      </section>

      {/* Overtakes */}
      <section className="panel">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
          <span className="micro-label">Overtakes</span>
          <DataStatusBadge status={d.overtakes.provenance.status} />
        </div>
        {(d.overtakes.data?.length ?? 0) === 0 ? (
          <p className="p-4 text-xs text-[var(--ink-3)]">No overtakes recorded for this session.</p>
        ) : (
          <ol className="max-h-72 overflow-y-auto px-4 py-2">
            {[...d.overtakes.data!].reverse().map((o, i) => (
              <li key={i} className="flex items-baseline gap-2 border-b border-[var(--line)] py-1 text-xs last:border-0">
                <span className="font-mono tnum text-[var(--ink-3)]">P{o.position}</span>
                <span className="font-mono font-semibold" style={{ color: color(o.overtakingDriverNumber) }}>{name(o.overtakingDriverNumber)}</span>
                <span className="text-[var(--ink-3)]">→</span>
                <span className="font-mono" style={{ color: color(o.overtakenDriverNumber) }}>{name(o.overtakenDriverNumber)}</span>
                <span className="ml-auto font-mono tnum text-[10px] text-[var(--ink-3)]">{o.date.slice(11, 19)} UTC</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Team radio */}
      <section className="panel">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
          <span className="micro-label">Team radio</span>
          <DataStatusBadge status={d.teamRadio.provenance.status} />
        </div>
        {(d.teamRadio.data?.length ?? 0) === 0 ? (
          <p className="p-4 text-xs text-[var(--ink-3)]">No radio clips published for this session.</p>
        ) : (
          <ol className="max-h-72 overflow-y-auto px-4 py-2">
            {d.teamRadio.data!.map((t, i) => (
              <RadioRow key={i} clip={t} label={name(t.driverNumber)} color={color(t.driverNumber)} />
            ))}
          </ol>
        )}
        <p className="px-4 pb-2 text-[10px] text-[var(--ink-3)]">
          Audio hosted by formula1.com, linked exactly as the provider published it.
        </p>
      </section>
    </div>
  );
}

function RadioRow({ clip, label, color }: { clip: TeamRadioClip; label: string; color: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <li className="flex items-center gap-2 border-b border-[var(--line)] py-1 text-xs last:border-0">
      <button
        className="flex h-6 w-6 items-center justify-center border border-[var(--line)] hover:text-[var(--accent)]"
        aria-label={playing ? `Pause ${label} radio` : `Play ${label} radio`}
        onClick={(e) => {
          const btn = e.currentTarget;
          let audio = btn.parentElement?.querySelector("audio");
          if (!audio) {
            audio = document.createElement("audio");
            audio.src = clip.recordingUrl;
            audio.preload = "none";
            audio.onended = () => setPlaying(false);
            btn.parentElement?.appendChild(audio);
          }
          if (playing) { audio.pause(); audio.currentTime = 0; setPlaying(false); }
          else { void audio.play().catch(() => setPlaying(false)); setPlaying(true); }
        }}
      >
        {playing ? <Pause size={11} /> : <Play size={11} />}
      </button>
      <span className="font-mono font-semibold" style={{ color }}>{label}</span>
      <span className="ml-auto font-mono tnum text-[10px] text-[var(--ink-3)]">{clip.date.slice(11, 19)} UTC</span>
    </li>
  );
}
