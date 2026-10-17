import { describe, expect, it } from "vitest";
import { drsLabel, formatGap, formatLapTime, formatSector, compoundColor } from "@/lib/utils/format";

describe("formatLapTime", () => {
  it("formats as m:ss.mmm", () => {
    expect(formatLapTime(97.599)).toBe("1:37.599");
    expect(formatLapTime(60)).toBe("1:00.000");
  });
  it("never renders NaN or undefined", () => {
    expect(formatLapTime(null)).toBe("—");
    expect(formatLapTime(undefined)).toBe("—");
    expect(formatLapTime(NaN)).toBe("—");
    expect(formatLapTime(-3)).toBe("—");
  });
});

describe("formatSector", () => {
  it("keeps three decimals", () => {
    expect(formatSector(28.888)).toBe("28.888");
  });
  it("handles missing", () => {
    expect(formatSector(null)).toBe("—");
  });
});

describe("formatGap", () => {
  it("passes lap strings through", () => {
    expect(formatGap("+1 LAP")).toBe("+1 LAP");
  });
  it("formats numeric gaps", () => {
    expect(formatGap(1.23456)).toBe("+1.235");
    expect(formatGap(null)).toBe("—");
  });
});

describe("drsLabel", () => {
  it("maps OpenF1 codes", () => {
    expect(drsLabel(0)).toBe("OFF");
    expect(drsLabel(8)).toBe("ELIGIBLE");
    expect(drsLabel(12)).toBe("ON");
    expect(drsLabel(null)).toBe("—");
  });
});

describe("compoundColor", () => {
  it("has a color for every compound and a fallback", () => {
    expect(compoundColor("SOFT")).toMatch(/^#/);
    expect(compoundColor("wet")).toMatch(/^#/);
    expect(compoundColor("HYPERSOFT")).toBe(compoundColor(null));
  });
});
