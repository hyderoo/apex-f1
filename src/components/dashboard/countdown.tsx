"use client";

import { useEffect, useState } from "react";
import { countdownParts, formatInTimeZone, formatLocalTime } from "@/lib/utils/time";
import { usePrefs } from "@/components/preferences";
import type { Session } from "@/lib/domain/types";

export function SessionCountdown({ session }: { session: Session }) {
  const { prefs } = usePrefs();
  const [, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const parts = countdownParts(session.dateStart);
  return (
    <div>
      <div className="micro-label">Next session</div>
      <div className="mt-1 text-lg font-semibold">
        {session.countryName} — {session.name}
      </div>
      <div className="mt-0.5 text-xs text-[var(--ink-3)]">
        {formatLocalTime(session.dateStart, session.gmtOffset, {
          weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
        })}{" "}
        track time ·{" "}
        {formatInTimeZone(session.dateStart, prefs.timezone, {
          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
        })}{" "}
        your time
      </div>
      {parts && !parts.past && (
        <div className="mt-3 flex gap-4 font-mono">
          {[
            [parts.days, "days"],
            [parts.hours, "hrs"],
            [parts.minutes, "min"],
            [parts.seconds, "sec"],
          ].map(([v, l]) => (
            <div key={String(l)}>
              <div className="text-2xl font-semibold tnum">{String(v).padStart(2, "0")}</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-[var(--ink-3)]">{l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
