"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { DataStatus, LeaderboardRow, Session } from "@/lib/domain/types";
import { formatGap, formatLapTime, formatSector, formatSpeed, compoundColor } from "@/lib/utils/format";
import { isStale, relativeAge } from "@/lib/utils/time";
import { DataStatusBadge } from "@/components/ui/badge";
import { TimingTowerSkeleton } from "@/components/ui/skeleton";
import { DriverAvatar } from "@/components/identity/driver-identity";
import { teamBadge as badgeFor } from "@/lib/assets/team-badges";
import { TeamBadge } from "@/components/identity/team-badge";
import { Term } from "@/components/ui/tooltip-term";
import { usePrefs } from "@/components/preferences";
import { hexToRgba } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { DragScroll } from "@/components/ui/drag-scroll";

interface LeaderboardResponse {
  session: Session;
  data: LeaderboardRow[];
  provenance: {
    provider: string;
    status: DataStatus;
    retrievedAt: string;
    staleAfterMs: number;
  };
}

const ALL_COLUMNS = [
  { id: "lastLap", label: "Last" },
  { id: "bestLap", label: "Best" },
  { id: "sectors", label: "Sectors" },
  { id: "gap", label: "Gap" },
  { id: "interval", label: "Int" },
  { id: "tyre", label: "Tyre" },
  { id: "pit", label: "Pit" },
  { id: "speed", label: "ST" },
] as const;

type SortKey = "position" | "lastLap" | "bestLap" | "gap";

export function TimingTower({
  sessionKey,
  compact = false,
  onSelectDriver,
  selectedDriver,
}: {
  sessionKey?: number;
  compact?: boolean;
  onSelectDriver?: (n: number) => void;
  selectedDriver?: number | null;
}) {
  const { prefs, isFavorite } = usePrefs();
  const [sortBy, setSortBy] = useState<SortKey>("position");
  const [visibleCols, setVisibleCols] = useState<string[] | null>(null);
  const [tick, setTick] = useState(0);

  const query = useQuery<LeaderboardResponse>({
    queryKey: ["leaderboard", sessionKey ?? "auto"],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard${sessionKey ? `?session=${sessionKey}` : ""}`);
      if (!res.ok) throw new Error("leaderboard failed");
      return res.json();
    },
    refetchInterval: (q) => {
      const s = q.state.data?.session?.status;
      if (s === "live") return 5000;
      return false;
    },
  });

  // local clock for staleness display
  useMemo(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);
  void tick;

  const cols = (visibleCols ?? prefs.timingColumns).filter((c) =>
    ALL_COLUMNS.some((c2) => c2.id === c),
  );

  const rows = useMemo(() => {
    const data = query.data?.data ?? [];
    if (sortBy === "position") return data;
    const val = (r: LeaderboardRow): number => {
      if (sortBy === "lastLap") return r.lastLap ?? Infinity;
      if (sortBy === "bestLap") return r.bestLap ?? Infinity;
      const g = r.gapToLeader;
      return typeof g === "number" ? g : Infinity;
    };
    return [...data].sort((a, b) => val(a) - val(b));
  }, [query.data, sortBy]);

  if (query.isPending) return <TimingTowerSkeleton rows={compact ? 6 : 20} />;
  if (query.isError || !query.data) {
    return (
      <div className="p-4 text-sm text-[var(--ink-3)]">
        Timing data unavailable. {query.error instanceof Error ? query.error.message : ""}
      </div>
    );
  }

  const { session, provenance } = query.data;
  const stale = isStale(provenance.retrievedAt, provenance.staleAfterMs);

  const cell = "px-2 py-1.5 text-right tnum font-mono text-[13px]";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-3 py-2">
        <DataStatusBadge status={provenance.status} />
        <span className="text-[11px] text-[var(--ink-3)]">
          {provenance.provider} · fetched {relativeAge(provenance.retrievedAt)}
        </span>
        {stale && provenance.status !== "historical" && provenance.status !== "demo" && (
          <span className="text-[11px] font-semibold text-[var(--warn)]">STALE</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {(["position", "lastLap", "bestLap", "gap"] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSortBy(k)}
              className={cn(
                "px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                sortBy === k ? "bg-[var(--surface-3)] text-[var(--ink)]" : "text-[var(--ink-3)]",
              )}
            >
              {k === "lastLap" ? "Last" : k === "bestLap" ? "Best" : k}
            </button>
          ))}
          <ColumnPicker cols={cols} onChange={setVisibleCols} />
        </div>
      </div>

      <DragScroll>
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--line)] text-left">
              <th className="micro-label px-2 py-1.5 w-8">P</th>
              <th className="micro-label px-2 py-1.5">Driver</th>
              {cols.includes("lastLap") && <th className="micro-label px-2 py-1.5 text-right">Last</th>}
              {cols.includes("bestLap") && <th className="micro-label px-2 py-1.5 text-right">Best</th>}
              {cols.includes("sectors") && (
                <th className="micro-label px-2 py-1.5 text-right" colSpan={3}>S1 / S2 / S3</th>
              )}
              {cols.includes("gap") && <th className="micro-label px-2 py-1.5 text-right"><Term>Gap to leader</Term></th>}
              {cols.includes("interval") && <th className="micro-label px-2 py-1.5 text-right"><Term>Interval</Term></th>}
              {cols.includes("tyre") && <th className="micro-label px-2 py-1.5 text-center"><Term>Compound</Term></th>}
              {cols.includes("pit") && <th className="micro-label px-2 py-1.5 text-right">Pit</th>}
              {cols.includes("speed") && <th className="micro-label px-2 py-1.5 text-right"><Term>Speed trap</Term></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <TimingRow
                key={r.driverNumber}
                row={r}
                cols={cols}
                cell={cell}
                favorite={isFavorite("driver", r.driverNumber)}
                selected={selectedDriver === r.driverNumber}
                onClick={onSelectDriver ? () => onSelectDriver(r.driverNumber) : undefined}
                isRace={session.type === "Race"}
              />
            ))}
          </tbody>
        </table>
      </DragScroll>
      {rows.length === 0 && (
        <div className="px-4 py-8 text-center text-xs text-[var(--ink-3)]">
          No timing data recorded for this session yet.
        </div>
      )}
    </div>
  );
}

function TimingRow({
  row: r, cols, cell, favorite, selected, onClick, isRace,
}: {
  row: LeaderboardRow;
  cols: string[];
  cell: string;
  favorite: boolean;
  selected: boolean;
  onClick?: () => void;
  isRace: boolean;
}) {
  const sectorClass = (i: number) =>
    r.sessionBestSectors[i]
      ? "text-[var(--sb)] font-semibold"
      : r.personalBestSectors[i]
        ? "text-[var(--pb)]"
        : "text-[var(--ink-2)]";
  return (
    <tr
      onClick={onClick}
      className={cn(
        "timing-row",
        onClick && "cursor-pointer",
        selected && "bg-[var(--surface-3)]",
        favorite && "border-l-2 border-l-[var(--accent)]",
      )}
    >
      <td className={cn(cell, "text-center text-[var(--ink-3)]")}>{r.position ?? "—"}</td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-4 w-1"
            style={{ background: hexToRgba(r.teamColour.startsWith("#") ? r.teamColour : `#${r.teamColour}`) }}
          />
          <DriverAvatar src={r.headshotUrl} acronym={r.acronym} teamColour={r.teamColour} size={22} />
          <span className="font-mono text-[13px] font-semibold" title={r.fullName}>{r.acronym}</span>
          <span className="hidden max-w-[9rem] items-center gap-1.5 truncate whitespace-nowrap text-[11px] text-[var(--ink-3)] lg:inline-flex" title={r.teamName}>
            {badgeFor(r.teamName) && <TeamBadge url={badgeFor(r.teamName)!.url} name={r.teamName} px={16}>{null}</TeamBadge>}
            {r.teamName}
          </span>
        </div>
      </td>
      {cols.includes("lastLap") && <td className={cell}>{formatLapTime(r.lastLap)}</td>}
      {cols.includes("bestLap") && <td className={cn(cell, "text-[var(--ink-2)]")}>{formatLapTime(r.bestLap)}</td>}
      {cols.includes("sectors") && (
        <>
          <td className={cn(cell, sectorClass(0))}>{formatSector(r.sector1)}</td>
          <td className={cn(cell, sectorClass(1))}>{formatSector(r.sector2)}</td>
          <td className={cn(cell, sectorClass(2))}>{formatSector(r.sector3)}</td>
        </>
      )}
      {cols.includes("gap") && (
        <td className={cell}>{isRace ? formatGap(r.gapToLeader) : "—"}</td>
      )}
      {cols.includes("interval") && (
        <td className={cn(cell, "text-[var(--ink-2)]")}>{isRace ? formatGap(r.interval) : "—"}</td>
      )}
      {cols.includes("tyre") && (
        <td className="px-2 py-1.5 text-center">
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-full border border-black/30"
              style={{ background: compoundColor(r.compound) }}
              title={r.compound ?? "unknown compound"}
            />
            {r.tyreAge != null && (
              <span className="font-mono text-[10px] text-[var(--ink-3)]">{r.tyreAge}L</span>
            )}
          </span>
        </td>
      )}
      {cols.includes("pit") && <td className={cell}>{r.pitStops > 0 ? r.pitStops : "—"}</td>}
      {cols.includes("speed") && <td className={cell}>{formatSpeed(r.speedTrap)}</td>}
    </tr>
  );
}

function ColumnPicker({ cols, onChange }: { cols: string[]; onChange: (c: string[]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="border border-[var(--line)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--ink-3)] hover:text-[var(--ink)]"
        aria-label="Customize columns"
      >
        Cols
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-36 border border-[var(--line-2)] bg-[var(--surface-2)] p-1 shadow-lg">
          {ALL_COLUMNS.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs hover:bg-[var(--surface-3)]">
              <input
                type="checkbox"
                checked={cols.includes(c.id)}
                onChange={(e) => {
                  const next = e.target.checked ? [...cols, c.id] : cols.filter((x) => x !== c.id);
                  onChange(next);
                }}
              />
              {c.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

