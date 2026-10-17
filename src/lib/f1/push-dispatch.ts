/**
 * Session-notification dispatch logic (pure, unit-tested).
 *
 * The API route /api/push/dispatch loads rows from Supabase and feeds them
 * here; this module decides what to send and renders the payload. No I/O.
 */

export type SessionKind = "race" | "sprint" | "qualifying" | "practice";

export const SESSION_KINDS: SessionKind[] = ["race", "sprint", "qualifying", "practice"];

/** Lead times offered in Settings. 15 min is the floor because the dispatch
 *  job runs every 15 minutes — shorter leads could be skipped entirely. */
export const LEAD_MINUTES_OPTIONS = [15, 30, 60] as const;

/** Classify an OpenF1 session name. Note: OpenF1 types Sprint as "Race" and
 *  Sprint Qualifying as "Qualifying", so classification must use the name. */
export function classifySession(name: string): SessionKind | null {
  const n = name.trim().toLowerCase();
  if (n === "race") return "race";
  if (n === "sprint") return "sprint";
  if (n.includes("qualifying") || n.includes("shootout")) return "qualifying";
  if (n.startsWith("practice") || n.startsWith("day ")) return "practice";
  return null;
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  sessionKinds: SessionKind[];
  leadMinutes: number;
  /** Empty = all circuits. */
  circuitKeys: number[];
}

export interface DispatchSession {
  sessionKey: number;
  meetingKey: number;
  name: string;
  circuitKey: number | null;
  /** ISO timestamp. */
  dateStart: string;
  meetingName: string;
  location: string;
}

export interface DueNotification {
  subscription: PushSubscriptionRow;
  session: DispatchSession;
  minutesUntil: number;
}

/** Dedupe key shared with the push_log table. */
export function sentKey(subscriptionId: string, sessionKey: number): string {
  return `${subscriptionId}:${sessionKey}`;
}

/**
 * Pick the (subscription, session) pairs due right now: the session starts
 * within the subscription's lead window, matches the wanted kinds and
 * circuit filter, and has not already been sent (per push_log).
 * Sessions that already started are skipped — a late dispatcher must never
 * deliver "starts in -3 min".
 */
export function selectDueNotifications(
  subscriptions: PushSubscriptionRow[],
  sessions: DispatchSession[],
  sent: Set<string>,
  now: Date,
): DueNotification[] {
  const out: DueNotification[] = [];
  for (const sub of subscriptions) {
    for (const s of sessions) {
      const kind = classifySession(s.name);
      if (!kind || !sub.sessionKinds.includes(kind)) continue;
      if (sub.circuitKeys.length > 0 && (s.circuitKey == null || !sub.circuitKeys.includes(s.circuitKey))) continue;
      if (sent.has(sentKey(sub.id, s.sessionKey))) continue;
      const ms = new Date(s.dateStart).getTime() - now.getTime();
      if (Number.isNaN(ms)) continue;
      const minutes = ms / 60000;
      if (minutes <= 0 || minutes > sub.leadMinutes) continue;
      out.push({ subscription: sub, session: s, minutesUntil: Math.max(1, Math.round(minutes)) });
    }
  }
  return out.sort((a, b) => a.minutesUntil - b.minutesUntil);
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Render the push payload. Time is shown in the subscriber's timezone. */
export function renderNotification(due: DueNotification): {
  title: string;
  body: string;
  tag: string;
  url: string;
} {
  const { subscription, session, minutesUntil } = due;
  const tz = isValidTimeZone(subscription.timezone) ? subscription.timezone : "UTC";
  const local = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(session.dateStart));
  const where = [session.meetingName, session.location].filter(Boolean).join(" · ");
  return {
    title: `${session.name} starts in ${minutesUntil} min`,
    body: `${where} — ${local}${tz ? ` (${tz})` : ""}`,
    tag: `session-${session.sessionKey}`,
    url: "/calendar",
  };
}
