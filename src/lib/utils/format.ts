/** Formatting helpers for timing values. Never render NaN/undefined. */

export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  const whole = Math.floor(s);
  const frac = Math.round((s - whole) * 1000);
  return `${m}:${String(whole).padStart(2, "0")}.${String(frac).padStart(3, "0")}`;
}

export function formatSector(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  return seconds.toFixed(3);
}

export function formatGap(gap: number | string | null | undefined): string {
  if (gap == null) return "—";
  if (typeof gap === "string") return gap; // e.g. "+1 LAP", "1 LAP"
  if (!Number.isFinite(gap)) return "—";
  return `+${gap.toFixed(3)}`;
}

export function formatSpeed(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${Math.round(v)}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  return `${m}m ${Math.round(seconds % 60)}s`;
}

/** OpenF1 DRS codes */
export function drsLabel(drs: number | null | undefined): string {
  if (drs == null) return "—";
  // OpenF1: 0-1 off, 8 eligible, 10/12/14 on (odd values are detection/unknown)
  if (drs === 0 || drs === 1) return "OFF";
  if (drs === 8) return "ELIGIBLE";
  if ([10, 12, 14].includes(drs)) return "ON";
  return "—";
}

export function hexToRgba(hex: string, alpha = 1): string {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  if (Number.isNaN(n)) return `rgba(255,255,255,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "#e10600",
  MEDIUM: "#ffd12e",
  HARD: "#f0f0f0",
  INTERMEDIATE: "#39b54a",
  WET: "#0067ff",
  UNKNOWN: "#8a8f98",
  TEST_UNKNOWN: "#8a8f98",
};

export function compoundColor(compound: string | null | undefined): string {
  if (!compound) return COMPOUND_COLORS.UNKNOWN;
  return COMPOUND_COLORS[compound.toUpperCase()] ?? COMPOUND_COLORS.UNKNOWN;
}
