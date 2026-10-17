import { cache } from "react";
import type { Envelope, Meeting, Session, SessionStatus } from "@/lib/domain/types";
import { getProvider, withDemoFallback } from "@/lib/providers";
import { fetchSeasonCalendar } from "@/lib/providers/jolpica";
import type { SeasonRound } from "@/lib/domain/types";

export const SEASON_YEAR = 2026;

export const getMeetings = cache(async (): Promise<Envelope<Meeting[]>> => {
  const { envelope } = await withDemoFallback((p) => p.meetings(SEASON_YEAR));
  return envelope;
});

export const getSessions = cache(async (): Promise<Envelope<Session[]>> => {
  const { envelope } = await withDemoFallback((p) => p.sessions(SEASON_YEAR));
  return envelope;
});

export const getSeasonCalendar = cache(async (): Promise<Envelope<SeasonRound[]> | null> => {
  try {
    return await fetchSeasonCalendar(SEASON_YEAR);
  } catch {
    return null;
  }
});

export async function getSessionsForMeeting(meetingKey: number): Promise<Session[]> {
  const env = await getSessions();
  return (env.data ?? [])
    .filter((s) => s.meetingKey === meetingKey)
    .sort((a, b) => a.dateStart.localeCompare(b.dateStart));
}

export function sessionsByStatus(sessions: Session[]) {
  const now = new Date();
  const live = sessions.filter((s) => s.status === "live");
  const upcoming = sessions
    .filter((s) => s.status === "upcoming" && s.dateStart)
    .sort((a, b) => a.dateStart.localeCompare(b.dateStart));
  const finished = sessions
    .filter((s) => s.status === "finished")
    .sort((a, b) => b.dateStart.localeCompare(a.dateStart));
  void now;
  return { live, upcoming, finished };
}

export interface MeetingWithSessions extends Meeting {
  sessions: Session[];
}

export async function getCalendar(): Promise<{
  meetings: MeetingWithSessions[];
  provenance: Envelope<unknown>["provenance"];
}> {
  const [meetingsEnv, sessionsEnv] = await Promise.all([getMeetings(), getSessions()]);
  const sessions = sessionsEnv.data ?? [];
  const meetings = (meetingsEnv.data ?? []).map((m) => ({
    ...m,
    sessions: sessions
      .filter((s) => s.meetingKey === m.meetingKey)
      .sort((a, b) => a.dateStart.localeCompare(b.dateStart)),
  }));
  return { meetings, provenance: meetingsEnv.provenance };
}

export function meetingStatus(m: MeetingWithSessions): SessionStatus {
  if (m.isCancelled) return "cancelled";
  return m.sessions.some((s) => s.status === "live")
    ? "live"
    : m.sessions.some((s) => s.status === "upcoming")
      ? "upcoming"
      : "finished";
}
