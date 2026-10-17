/** Time and timezone helpers. Default display timezone is Asia/Jakarta. */

export const DEFAULT_TIMEZONE = "Asia/Jakarta";

export function formatInTimeZone(
  iso: string | Date,
  timeZone: string = DEFAULT_TIMEZONE,
  opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  },
): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone, ...opts }).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-GB", opts).format(d);
  }
}

export function formatLocalTime(
  iso: string,
  gmtOffset: string,
  opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  },
): string {
  const tz = offsetToTimeZone(gmtOffset);
  return formatInTimeZone(iso, tz, opts);
}

/** Convert "+03:00" style offsets to a fixed Etc/GMT zone name. */
export function offsetToTimeZone(gmtOffset: string): string {
  const m = /^([+-])(\d{2}):(\d{2})/.exec(gmtOffset.trim());
  if (!m) return "UTC";
  const sign = m[1] === "+" ? -1 : 1; // Etc/GMT signs are inverted
  const hours = parseInt(m[2], 10) + parseInt(m[3], 10) / 60;
  const v = sign * hours;
  if (v === 0) return "UTC";
  return `Etc/GMT${v > 0 ? "+" : "-"}${Math.abs(v)}`;
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function countdownParts(targetIso: string, now = Date.now()) {
  const ms = new Date(targetIso).getTime() - now;
  if (Number.isNaN(ms)) return null;
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const seconds = Math.floor((abs % 60_000) / 1000);
  return { past: ms < 0, days, hours, minutes, seconds };
}

export function relativeAge(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "unknown";
  if (ms < 0) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function isStale(retrievedAtIso: string, staleAfterMs: number, now = Date.now()): boolean {
  const t = new Date(retrievedAtIso).getTime();
  if (Number.isNaN(t)) return true;
  return now - t > staleAfterMs;
}
