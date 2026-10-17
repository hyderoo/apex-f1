"use client";

import Link from "next/link";
import type { MeetingWithSessions } from "@/lib/f1/season";
import { formatInTimeZone, formatLocalTime } from "@/lib/utils/time";
import { usePrefs } from "@/components/preferences";
import { Badge } from "@/components/ui/badge";

export function MeetingDetailClient({ meeting }: { meeting: MeetingWithSessions }) {
  const { prefs } = usePrefs();
  return (
    <ul className="divide-y divide-[var(--line)]">
      {meeting.sessions.map((s) => (
        <li key={s.sessionKey} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
          <div className="w-36">
            <div className="text-sm font-medium">{s.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--ink-3)]">{s.type}</div>
          </div>
          <div className="font-mono text-xs tnum text-[var(--ink-2)]">
            {formatLocalTime(s.dateStart, s.gmtOffset, {
              weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
            })}
            <span className="text-[var(--ink-3)]"> track</span>
          </div>
          <div className="font-mono text-xs tnum text-[var(--ink-3)]">
            {formatInTimeZone(s.dateStart, prefs.timezone, {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
            })}{" "}
            your time
          </div>
          <div className="ml-auto flex items-center gap-2">
            {s.status === "live" && <Badge tone="accent">Live</Badge>}
            {s.status === "cancelled" && <Badge>Cancelled</Badge>}
            {(s.status === "finished" || s.status === "live") && (
              <Link
                href={`/live?session=${s.sessionKey}`}
                className="text-[11px] text-[var(--accent)] hover:underline"
              >
                Timing →
              </Link>
            )}
            <a
              href={`/api/ics?session=${s.sessionKey}`}
              className="text-[11px] text-[var(--ink-3)] hover:text-[var(--ink)]"
            >
              .ics
            </a>
          </div>
        </li>
      ))}
      {meeting.sessions.length === 0 && (
        <li className="px-4 py-6 text-sm text-[var(--ink-3)]">
          Session schedule not yet published for this round.
        </li>
      )}
    </ul>
  );
}
