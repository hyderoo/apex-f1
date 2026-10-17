"use client";

import { useEffect, useRef, useState } from "react";
import type { RadioClipView, RadioDriverGroup } from "@/lib/radio";
import { hexToRgba } from "@/lib/utils/format";
import { teamBadge } from "@/lib/assets/team-badges";
import { TeamBadge } from "@/components/identity/team-badge";

function fmtClock(iso: string) {
  return `${iso.slice(11, 19)}`;
}
function fmtElapsed(sec: number) {
  if (!Number.isFinite(sec)) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Custom single-player clip wall. One shared audio element: starting a clip
 * stops whatever was playing. Audio streams from the provider-supplied F1
 * livetiming URL; nothing is re-hosted. Duration is only known once a clip
 * has loaded — until then times show as --:-- rather than a guess.
 */
export function RadioPlayer({ groups }: { groups: RadioDriverGroup[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(NaN);

  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    audioRef.current = a;
    const onTime = () => setElapsed(a.currentTime);
    const onMeta = () => setDuration(a.duration);
    const onEnd = () => { setPlaying(false); setElapsed(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = (url: string) => {
    const a = audioRef.current;
    if (!a) return;
    if (activeUrl === url) {
      if (playing) { a.pause(); setPlaying(false); }
      else { void a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
      return;
    }
    a.src = url;
    setActiveUrl(url);
    setElapsed(0);
    setDuration(NaN);
    void a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const seek = (frac: number) => {
    const a = audioRef.current;
    if (!a || !Number.isFinite(a.duration)) return;
    a.currentTime = frac * a.duration;
    setElapsed(a.currentTime);
  };

  return (
    <div className="grid grid-cols-1 gap-px bg-[var(--line)] lg:grid-cols-2">
      {groups.map((g) => {
        const colour = `#${g.teamColour}`;
        const badge = teamBadge(g.teamName);
        return (
          <section key={g.driverNumber} className="panel">
            <header className="flex items-center gap-2.5 border-b border-[var(--line)] px-3 py-2">
              <span className="h-4 w-1 shrink-0" style={{ background: colour }} />
              {badge && <TeamBadge url={badge.url} name={g.teamName} px={20}>{null}</TeamBadge>}
              <span className="font-mono text-xs font-bold" style={{ color: colour }}>{g.acronym}</span>
              <span className="truncate text-sm font-medium">{g.fullName}</span>
              <span className="truncate text-[11px] text-[var(--ink-3)]">{g.teamName}</span>
              <span className="ml-auto shrink-0 font-mono text-[10px] tnum text-[var(--ink-3)]">
                {g.clips.length} clip{g.clips.length === 1 ? "" : "s"}
              </span>
            </header>
            <ul>
              {g.clips.map((c) => (
                <ClipRow
                  key={c.recordingUrl}
                  clip={c}
                  colour={colour}
                  active={activeUrl === c.recordingUrl}
                  playing={activeUrl === c.recordingUrl && playing}
                  elapsed={activeUrl === c.recordingUrl ? elapsed : 0}
                  duration={activeUrl === c.recordingUrl ? duration : NaN}
                  onToggle={() => toggle(c.recordingUrl)}
                  onSeek={seek}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ClipRow({
  clip, colour, active, playing, elapsed, duration, onToggle, onSeek,
}: {
  clip: RadioClipView; colour: string; active: boolean; playing: boolean;
  elapsed: number; duration: number; onToggle: () => void; onSeek: (frac: number) => void;
}) {
  const frac = active && Number.isFinite(duration) && duration > 0 ? Math.min(1, elapsed / duration) : 0;
  return (
    <li className={active ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]"}>
      <div className="flex items-center gap-3 px-3 py-1.5">
        <button
          type="button"
          onClick={onToggle}
          aria-label={playing ? `Pause ${clip.acronym} radio at ${fmtClock(clip.date)} UTC` : `Play ${clip.acronym} radio at ${fmtClock(clip.date)} UTC`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] border transition-colors"
          style={{
            borderColor: hexToRgba(colour, active ? 0.9 : 0.4),
            background: active ? hexToRgba(colour, 0.16) : "transparent",
          }}
        >
          {playing ? (
            <span className="flex gap-[2px]" aria-hidden>
              <span className="h-2.5 w-[2px]" style={{ background: colour }} />
              <span className="h-2.5 w-[2px]" style={{ background: colour }} />
            </span>
          ) : (
            <span
              aria-hidden
              className="ml-px h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent"
              style={{ borderLeftColor: colour }}
            />
          )}
        </button>
        <span className="font-mono text-[11px] tnum text-[var(--ink-3)]">{fmtClock(clip.date)}</span>
        {active && (
          <span className="ml-auto font-mono text-[10px] tnum text-[var(--ink-2)]">
            {fmtElapsed(elapsed)} / {fmtElapsed(duration)}
          </span>
        )}
      </div>
      {active && (
        <div className="px-3 pb-2 pl-12">
          <div
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(frac * 100)}
            tabIndex={0}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onSeek((e.clientX - r.left) / r.width);
            }}
            onKeyDown={(e) => {
              if (!Number.isFinite(duration)) return;
              if (e.key === "ArrowRight") onSeek(Math.min(1, frac + 5 / duration));
              if (e.key === "ArrowLeft") onSeek(Math.max(0, frac - 5 / duration));
            }}
            className="h-1 w-full cursor-pointer rounded-full bg-[var(--surface-3)]"
          >
            <div className="h-full rounded-full transition-[width] duration-150" style={{ width: `${frac * 100}%`, background: colour }} />
          </div>
        </div>
      )}
    </li>
  );
}
