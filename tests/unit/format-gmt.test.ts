import { describe, expect, it } from "vitest";
import { formatGmtOffset } from "@/lib/utils/format";

describe("formatGmtOffset", () => {
  it("handles OpenF1 2026 format without sign", () => {
    expect(formatGmtOffset("02:00:00")).toBe("GMT+2");
    expect(formatGmtOffset("11:00:00")).toBe("GMT+11");
  });
  it("handles signed offsets", () => {
    expect(formatGmtOffset("+03:00")).toBe("GMT+3");
    expect(formatGmtOffset("-08:00")).toBe("GMT-8");
    expect(formatGmtOffset("-05:00:00")).toBe("GMT-5");
  });
  it("keeps non-zero minutes", () => {
    expect(formatGmtOffset("+05:30")).toBe("GMT+5:30");
  });
  it("degrades honestly on missing data", () => {
    expect(formatGmtOffset(null)).toBe("GMT");
    expect(formatGmtOffset("")).toBe("GMT");
  });
});
