"use client";

import { useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import type { DataStatus, RaceControlMessage } from "@/lib/domain/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatInTimeZone } from "@/lib/utils/time";
import { usePrefs } from "@/components/preferences";

interface RCResponse {
  data: RaceControlMessage[];
  provenance: { status: DataStatus; provider: string };
}

function flagTone(flag: string | null): "accent" | "warn" | "neutral" | "ok" {
  if (!flag) return "neutral";
  const f = flag.toUpperCase();
  if (f.includes("RED")) return "accent";
  if (f.includes("YELLOW") || f.includes("DOUBLE")) return "warn";
  if (f.includes("GREEN") || f.includes("CLEAR")) return "ok";
  return "neutral";
}

export function RaceControlFeed({ sessionKey, limit = 8 }: { sessionKey?: number; limit?: number }) {
  const { prefs } = usePrefs();
  const { data, isPending } = useQuery<RCResponse>({
    queryKey: ["race-control", sessionKey ?? "auto"],
    queryFn: async () => {
      const res = await fetch(`/api/race-control${sessionKey ? `?session=${sessionKey}` : ""}`);
      if (!res.ok) throw new Error("race control failed");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  if (isPending) return <Skeleton className="h-40 w-full" />;
  const rows = (data?.data ?? []).slice(0, limit);
  if (rows.length === 0) {
    return <div className="p-4 text-xs text-[var(--ink-3)]">No race control messages for this session.</div>;
  }
  return (
    <ul className="divide-y divide-[var(--line)]">
      {rows.map((m, i) => (
        <li key={`${m.date}-${i}`} className="flex gap-2 px-3 py-2">
          <Flag size={12} className="mt-0.5 shrink-0 text-[var(--ink-3)]" />
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-snug text-[var(--ink)]">{m.message}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] text-[var(--ink-3)]">
                {formatInTimeZone(m.date, prefs.timezone, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
              </span>
              {m.lapNumber != null && <span className="text-[10px] text-[var(--ink-3)]">LAP {m.lapNumber}</span>}
              {m.flag && <Badge tone={flagTone(m.flag)}>{m.flag}</Badge>}
              {m.category && m.category !== "Flag" && <Badge>{m.category}</Badge>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
