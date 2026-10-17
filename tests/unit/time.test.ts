import { describe, expect, it } from "vitest";
import {
  countdownParts, formatInTimeZone, isStale, isValidTimezone, offsetToTimeZone, relativeAge,
} from "@/lib/utils/time";

describe("offsetToTimeZone", () => {
  it("converts positive offsets to Etc/GMT with inverted sign", () => {
    expect(offsetToTimeZone("+03:00")).toBe("Etc/GMT-3");
    expect(offsetToTimeZone("+09:00")).toBe("Etc/GMT-9");
    expect(offsetToTimeZone("-05:00")).toBe("Etc/GMT+5");
    expect(offsetToTimeZone("+00:00")).toBe("UTC");
  });
  it("handles malformed input as UTC", () => {
    expect(offsetToTimeZone("garbage")).toBe("UTC");
  });
});

describe("formatInTimeZone", () => {
  it("converts UTC to Asia/Jakarta (+7)", () => {
    const out = formatInTimeZone("2026-10-11T12:00:00Z", "Asia/Jakarta", {
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    expect(out).toBe("19:00");
  });
  it("handles day rollover across the date line", () => {
    const out = formatInTimeZone("2026-03-08T04:00:00Z", "Australia/Sydney", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    });
    expect(out).toContain("8 Mar");
  });
  it("returns a dash for invalid dates", () => {
    expect(formatInTimeZone("not-a-date", "Asia/Jakarta")).toBe("—");
  });
});

describe("countdownParts", () => {
  it("computes future countdowns", () => {
    const now = Date.parse("2026-10-17T00:00:00Z");
    const p = countdownParts("2026-10-18T01:30:00Z", now)!;
    expect(p.past).toBe(false);
    expect(p.days).toBe(1);
    expect(p.hours).toBe(1);
    expect(p.minutes).toBe(30);
  });
  it("flags past targets", () => {
    const p = countdownParts("2020-01-01T00:00:00Z")!;
    expect(p.past).toBe(true);
  });
});

describe("staleness", () => {
  it("isStale compares against staleAfterMs", () => {
    const now = Date.now();
    expect(isStale(new Date(now - 10_000).toISOString(), 5_000, now)).toBe(true);
    expect(isStale(new Date(now - 1_000).toISOString(), 5_000, now)).toBe(false);
  });
  it("relativeAge formats recent times", () => {
    const now = Date.now();
    expect(relativeAge(new Date(now - 2_000).toISOString(), now)).toBe("just now");
    expect(relativeAge(new Date(now - 30_000).toISOString(), now)).toBe("30s ago");
    expect(relativeAge(new Date(now - 120_000).toISOString(), now)).toBe("2m ago");
  });
});

describe("isValidTimezone", () => {
  it("accepts real zones and rejects junk", () => {
    expect(isValidTimezone("Asia/Jakarta")).toBe(true);
    expect(isValidTimezone("Mars/Olympus")).toBe(false);
  });
});
