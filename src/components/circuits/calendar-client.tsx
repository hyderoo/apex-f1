"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MeetingWithSessions } from "@/lib/f1/season";
import type { SessionStatus } from "@/lib/domain/types";
import { formatInTimeZone, formatLocalTime } from "@/lib/utils/time";
import { usePrefs } from "@/components/preferences";
import { Badge } from "@/components/ui/badge";
import { FlagImage } from "@/components/identity/country-flag";
import { CircuitImage } from "@/components/identity/circuit-image";
import { cn } from "@/lib/utils/cn";

type Filter = "all" | "upcoming" | "past";

export function CalendarClient({
  meetings,
  statusByMeeting,
}: {
  meetings: MeetingWithSessions[];
  statusByMeeting: Record<number, SessionStatus>;
}) {
  const { prefs } = usePrefs();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    let list = meetings;
    if (filter !== "all") {
      list = list.filter((m) =>
        filter === "past" ? statusByMeeting[m.meetingKey] === "finished" : statusByMeeting[m.meetingKey] !== "finished",
      );
    }
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(needle) ||
          m.countryName.toLowerCase().includes(needle) ||
          m.circuitShortName.toLowerCase().includes(needle),
      );
    }
    return list;
  }, [meetings, filter, q, statusByMeeting]);

  return (
    <div className="px-4 py-4 md:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Grand Prix, country or circuit"
          className="h-9 w-64 border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm outline-none focus:border-[var(--line-2)] sm:w-80"
        />
        <div className="flex border border-[var(--line)]">
          {(["all", "upcoming", "past"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-[11px] uppercase tracking-wider",
                filter === f ? "bg-[var(--surface-3)] text-[var(--ink)]" : "text-[var(--ink-3)]",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((m, i) => {
          const status = statusByMeeting[m.meetingKey];
          const round = meetings.indexOf(m) + 1;
          return (
            <Link
              key={m.meetingKey}
              href={`/calendar/${m.meetingKey}`}
              className="panel panel-ticks group flex flex-col gap-2 p-4 transition-colors hover:bg-[var(--surface-3)] md:flex-row md:items-center"
            >
              <div className="flex w-14 shrink-0 items-start">
                <span className="font-mono text-2xl font-semibold text-[var(--ink-3)] group-hover:text-[var(--accent)]">
                  {String(round).padStart(2, "0")}
                </span>
              </div>
              <FlagImage src={m.countryFlagUrl} label={m.countryName} size={18} className="shrink-0 self-start mt-1" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold">{m.name}</span>
                  {status === "live" && <Badge tone="accent">Live now</Badge>}
                  {status === "finished" && <Badge>Completed</Badge>}
                  {m.sessions.some((s) => s.name.toLowerCase().includes("sprint")) && (
                    <Badge tone="pb">Sprint</Badge>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-[var(--ink-3)]">
                  {m.circuitShortName === m.location ? m.location : `${m.circuitShortName} · ${m.location}`}, {m.countryName}
                </div>
              </div>
              <div className="text-left md:text-right">
                <div className="font-mono text-sm tnum">
                  {formatInTimeZone(m.dateStart, prefs.timezone, { day: "numeric", month: "short" })}
                  {" — "}
                  {formatInTimeZone(m.dateEnd, prefs.timezone, { day: "numeric", month: "short" })}
                </div>
                <div className="text-[11px] text-[var(--ink-3)]">
                  Race {formatLocalTime(
                    m.sessions.find((s) => s.type === "Race" && s.name === "Race")?.dateStart ?? m.dateEnd,
                    m.gmtOffset,
                    { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false },
                  )}{" "}
                  track
                </div>
              </div>
              <span className="hidden shrink-0 self-center md:block">
                <CircuitImage src={m.circuitImageUrl} label={m.circuitShortName} width={72} height={54} />
              </span>
              <span className="sr-only">Round {i + 1}</span>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="panel p-8 text-center text-sm text-[var(--ink-3)]">No rounds match.</div>
        )}
      </div>
    </div>
  );
}
