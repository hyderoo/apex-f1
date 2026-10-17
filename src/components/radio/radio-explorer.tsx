"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DataStatus, Driver, Meeting, Session, TeamRadioClip } from "@/lib/domain/types";
import { buildClipList, groupClipsByDriver, teamOptions } from "@/lib/radio";
import { Skeleton } from "@/components/ui/skeleton";
import { DataStatusBadge } from "@/components/ui/badge";
import { CopyLinkButton } from "@/components/ui/copy-link";
import { RadioPlayer } from "@/components/radio/radio-player";

interface RadioResponse {
  drivers: Driver[];
  clips: TeamRadioClip[];
  provenance: { status: DataStatus; provider: string; retrievedAt: string };
  error?: string;
}

export function RadioExplorer({
  years,
}: {
  years: { year: number; meetings: Meeting[]; sessions: Session[] }[];
}) {
  const available = years.filter((y) => y.sessions.length > 0);
  const [year, setYear] = useState(available[0]?.year ?? 2026);
  const yearData = available.find((y) => y.year === year) ?? available[0];

  const [meetingKey, setMeetingKey] = useState<number | null>(null);
  const [sessionKey, setSessionKey] = useState<number | null>(null);
  const withSessions = new Set((yearData?.sessions ?? []).map((s) => s.meetingKey));
  const meetings = (yearData?.meetings ?? [])
    .filter((m) => withSessions.has(m.meetingKey))
    .sort((a, b) => b.dateStart.localeCompare(a.dateStart));
  const meeting = meetings.find((m) => m.meetingKey === meetingKey) ?? meetings[0];
  const sessions = (yearData?.sessions ?? [])
    .filter((s) => s.meetingKey === meeting?.meetingKey)
    .sort((a, b) => b.dateStart.localeCompare(a.dateStart));
  const session = sessions.find((s) => s.sessionKey === sessionKey) ?? sessions[0];

  const [team, setTeam] = useState<string>("");
  const [driverNumber, setDriverNumber] = useState<number | null>(null);

  const query = useQuery<RadioResponse>({
    queryKey: ["radio", session?.sessionKey],
    queryFn: async () => {
      const res = await fetch(`/api/radio?session=${session?.sessionKey}`);
      return res.json();
    },
    enabled: session != null,
    placeholderData: (prev) => prev,
  });

  const drivers = query.data?.drivers ?? [];
  const teams = teamOptions(drivers);
  const visibleDrivers = drivers.filter((d) => !team || d.teamName === team);
  const clips = buildClipList(query.data?.clips ?? [], drivers).filter((c) =>
    (driverNumber == null || c.driverNumber === driverNumber) &&
    (!team || c.teamName === team),
  );
  const groups = groupClipsByDriver(clips, drivers);

  return (
    <div className="px-4 py-4 md:px-6">
      <div className="flex flex-wrap items-end gap-3 border-b border-[var(--line)] pb-4">
        <label className="block">
          <span className="micro-label">Season</span>
          <select
            value={year}
            onChange={(e) => { setYear(Number(e.target.value)); setMeetingKey(null); setSessionKey(null); setDriverNumber(null); setTeam(""); }}
            className="mt-1 h-9 border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          >
            {available.map((y) => <option key={y.year} value={y.year}>{y.year}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="micro-label">Grand Prix</span>
          <select
            value={meeting?.meetingKey}
            onChange={(e) => { setMeetingKey(Number(e.target.value)); setSessionKey(null); setDriverNumber(null); }}
            className="mt-1 h-9 w-56 max-w-full border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          >
            {meetings.map((m) => <option key={m.meetingKey} value={m.meetingKey}>{m.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="micro-label">Session</span>
          <select
            value={session?.sessionKey}
            onChange={(e) => { setSessionKey(Number(e.target.value)); setDriverNumber(null); }}
            className="mt-1 h-9 border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          >
            {sessions.map((s) => <option key={s.sessionKey} value={s.sessionKey}>{s.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="micro-label">Team</span>
          <select
            value={team}
            onChange={(e) => { setTeam(e.target.value); setDriverNumber(null); }}
            className="mt-1 h-9 w-44 max-w-full border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          >
            <option value="">All teams</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="micro-label">Driver</span>
          <select
            value={driverNumber ?? ""}
            onChange={(e) => setDriverNumber(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 h-9 border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
          >
            <option value="">All drivers</option>
            {visibleDrivers.map((d) => <option key={d.driverNumber} value={d.driverNumber}>{d.acronym} — {d.fullName}</option>)}
          </select>
        </label>
        {query.data && !query.data.error && <DataStatusBadge status={query.data.provenance.status} />}
        <CopyLinkButton />
      </div>

      {available.length === 0 && (
        <div className="p-8 text-center text-sm text-[var(--ink-3)]">
          Season data is unavailable from the provider right now. Try again later.
        </div>
      )}
      {query.isPending && available.length > 0 && <Skeleton className="mt-4 h-96 w-full" />}
      {query.data?.error && (
        <div className="p-8 text-center text-sm text-[var(--ink-3)]">
          Team radio is temporarily unavailable from the provider (rate limited). Try again in a minute.
        </div>
      )}
      {query.data && !query.data.error && (
        <div className="mt-4">
          <div className="micro-label mb-2">{clips.length} recorded clip{clips.length === 1 ? "" : "s"}{session ? ` · ${session.name}` : ""}</div>
          {clips.length === 0 && (
            <div className="panel p-8 text-center text-sm text-[var(--ink-3)]">
              No radio clips were recorded for this selection. OpenF1 carries only a
              selection of communications, and some sessions have none.
            </div>
          )}
          <RadioPlayer groups={groups} />
          <p className="mt-3 text-[10px] leading-snug text-[var(--ink-3)]">
            Clips stream directly from the F1 livetiming CDN at the URLs OpenF1
            supplies; some networks or regions may block them. OpenF1 includes
            only a selection of radio communications, not the complete record.
            Timestamps are UTC. The provider publishes no transcripts, so none are shown.
          </p>
        </div>
      )}
    </div>
  );
}
