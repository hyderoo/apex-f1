import { describe, expect, it } from "vitest";
import { teamBadge } from "@/lib/assets/team-badges";

describe("teamBadge resolution", () => {
  it("resolves every OpenF1 2026 team name", () => {
    const openF1 = ["Alpine", "Aston Martin", "Audi", "Cadillac", "Ferrari", "Haas F1 Team", "McLaren", "Mercedes", "Racing Bulls", "Red Bull Racing", "Williams"];
    for (const name of openF1) expect(teamBadge(name), name).not.toBeNull();
  });

  it("resolves every Jolpica 2026 constructor name (verified live 2026-10-18)", () => {
    const jolpica: [string, string][] = [
      ["Mercedes", "Mercedes-AMG PETRONAS Formula One Team"], ["Ferrari", "Scuderia Ferrari HP"], ["McLaren", "McLaren Formula 1 Team"],
      ["Red Bull", "Oracle Red Bull Racing"], ["RB F1 Team", "Visa Cash App Racing Bulls Formula One Team"],
      ["Alpine F1 Team", "BWT Alpine Formula One Team"], ["Haas F1 Team", "MoneyGram Haas F1 Team"],
      ["Audi", "Audi Revolut F1 Team"], ["Williams", "Williams Racing"],
      ["Aston Martin", "Aston Martin Aramco Formula One Team"], ["Cadillac F1 Team", "Cadillac Formula 1 Team"],
    ];
    for (const [name, sourceName] of jolpica) {
      expect(teamBadge(name)?.sourceName, name).toBe(sourceName);
    }
  });

  it("returns null for unknown teams rather than guessing", () => {
    expect(teamBadge("Andretti Global")).toBeNull();
    expect(teamBadge("")).toBeNull();
  });

  it("only serves TheSportsDB badge URLs", () => {
    for (const name of ["Ferrari", "Red Bull", "Cadillac F1 Team"]) {
      expect(teamBadge(name)?.url).toMatch(/^https:\/\/r2\.thesportsdb\.com\/images\/media\/team\/badge\//);
    }
  });
});
