"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TimingTower } from "./timing-tower";
import { WeatherPanel } from "@/components/dashboard/weather-panel";
import { RaceControlFeed } from "@/components/dashboard/race-control-feed";
import { Badge } from "@/components/ui/badge";

export function LiveClient({
  sessions,
  selectedKey,
}: {
  sessions: { sessionKey: number; label: string; status: string }[];
  selectedKey: number | null;
}) {
  const router = useRouter();
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  return (
    <div>
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-2">
        <span className="micro-label">Session</span>
        <select
          value={selectedKey ?? ""}
          onChange={(e) => router.push(`/live?session=${e.target.value}`)}
          className="h-8 border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs"
        >
          {sessions.map((s) => (
            <option key={s.sessionKey} value={s.sessionKey}>
              {s.label}
            </option>
          ))}
        </select>
        {sessions.find((s) => s.sessionKey === selectedKey)?.status === "live" && (
          <Badge tone="accent">In progress</Badge>
        )}
      </div>
      <div className="grid grid-cols-1 gap-px bg-[var(--line)] xl:grid-cols-3">
        <section className="panel xl:col-span-2">
          <TimingTower
            sessionKey={selectedKey ?? undefined}
            onSelectDriver={(n) => setSelectedDriver(n === selectedDriver ? null : n)}
            selectedDriver={selectedDriver}
          />
        </section>
        <div className="flex flex-col gap-px bg-[var(--line)]">
          <section className="panel">
            <div className="border-b border-[var(--line)] px-4 py-2.5">
              <span className="micro-label">Weather</span>
            </div>
            <WeatherPanel sessionKey={selectedKey ?? undefined} />
          </section>
          <section className="panel flex-1">
            <div className="border-b border-[var(--line)] px-4 py-2.5">
              <span className="micro-label">Race control</span>
            </div>
            <RaceControlFeed sessionKey={selectedKey ?? undefined} limit={30} />
          </section>
        </div>
      </div>
    </div>
  );
}
