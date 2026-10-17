import { describe, expect, it } from "vitest";
import { buildClipList, teamOptions } from "@/lib/radio";
import type { Driver } from "@/lib/domain/types";

const driver = (n: number, acronym: string, team: string, colour: string): Driver => ({
  driverNumber: n, broadcastName: acronym, fullName: acronym, firstName: "", lastName: "",
  acronym, teamName: team, teamColour: colour, headshotUrl: null, countryCode: null,
});

describe("buildClipList", () => {
  it("sorts chronologically and joins driver identity", () => {
    const clips = [
      { date: "2026-10-11T13:00:00Z", driverNumber: 3, recordingUrl: "b.mp3" },
      { date: "2026-10-11T12:00:00Z", driverNumber: 1, recordingUrl: "a.mp3" },
    ];
    const out = buildClipList(clips, [driver(1, "NOR", "McLaren", "ff8000"), driver(3, "VER", "Red Bull", "3671c6")]);
    expect(out.map((c) => c.acronym)).toEqual(["NOR", "VER"]);
    expect(out[1].teamColour).toBe("3671c6");
  });
  it("falls back honestly for unknown drivers", () => {
    const out = buildClipList([{ date: "2026-01-01T00:00:00Z", driverNumber: 99, recordingUrl: "x.mp3" }], []);
    expect(out[0].acronym).toBe("#99");
    expect(out[0].teamName).toBe("Unknown team");
  });
});

describe("teamOptions", () => {
  it("returns unique sorted team names", () => {
    expect(teamOptions([driver(1, "A", "Zeta", "x"), driver(2, "B", "Alpha", "y"), driver(3, "C", "Zeta", "z")]))
      .toEqual(["Alpha", "Zeta"]);
  });
});
